import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  isWhitelisted: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  const checkAdmin = async (userId: string, email: string) => {
    try {
      const [roleResult, whitelistResult] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("is_admin_whitelisted", { _email: email }),
      ]);
      setIsAdmin(!!roleResult.data);
      setIsWhitelisted(!!whitelistResult.data);
    } catch {
      setIsAdmin(false);
      setIsWhitelisted(false);
    } finally {
      setAdminLoading(false);
    }
  };

  const applySession = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      setAdminLoading(true);
      void checkAdmin(nextSession.user.id, nextSession.user.email ?? "");
    } else {
      setIsAdmin(false);
      setIsWhitelisted(false);
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Boot-time snapshot so we can see exactly what the OAuth redirect delivered.
    try {
      const storageKeys = Object.keys(window.localStorage).filter((k) =>
        k.includes("supabase") || k.includes("sb-")
      );
      console.info("[Auth] Boot snapshot", {
        href: window.location.href,
        host: window.location.host,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer,
        supabaseStorageKeys: storageKeys,
      });
    } catch (err) {
      console.warn("[Auth] Boot snapshot failed", err);
    }

    const cleanupOAuthErrorParams = () => {
      const url = new URL(window.location.href);
      const search = new URLSearchParams(url.search);
      const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
      const error = search.get("error") ?? hash.get("error");
      const errorDescription = search.get("error_description") ?? hash.get("error_description");

      if (!error) return;

      console.error("[Auth] OAuth provider returned error:", error, errorDescription);
      ["error", "error_description", "state"].forEach((key) => url.searchParams.delete(key));
      if (hash.has("error") || hash.has("error_description")) url.hash = "";
      window.history.replaceState({}, "", url.toString());
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      console.info("[Auth] onAuthStateChange", {
        event,
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
        href: window.location.href,
      });
      applySession(nextSession);
      setLoading(false);
    });

    const initializeAuth = async () => {
      cleanupOAuthErrorParams();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;
      applySession(currentSession);
      setLoading(false);
    };

    void initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Re-check whitelist status when user changes (no realtime — admin_whitelist
  // is intentionally NOT in the realtime publication to avoid leaking admin emails).
  useEffect(() => {
    if (!user?.email) return;
    supabase.rpc("is_admin_whitelisted", { _email: user.email }).then(({ data }) => {
      setIsWhitelisted(!!data);
    });
  }, [user?.email]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminLoading, isWhitelisted, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
