import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
    // Handle OAuth callback from Lovable Cloud broker (full-page redirect flow).
    // When the broker returns tokens, they arrive as query params or hash fragment.
    // We must call supabase.auth.setSession manually because the broker uses a
    // custom param format that supabase's detectSessionInUrl does not recognize.
    const consumeOAuthCallback = async () => {
      try {
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(
          window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
        );
        const access_token = search.get("access_token") ?? hash.get("access_token");
        const refresh_token = search.get("refresh_token") ?? hash.get("refresh_token");
        const error = search.get("error") ?? hash.get("error");
        if (error) {
          // Strip error params from URL so we don't loop.
          const url = new URL(window.location.href);
          ["error", "error_description", "state"].forEach((k) => {
            url.searchParams.delete(k);
          });
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
          return;
        }
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          const url = new URL(window.location.href);
          ["access_token", "refresh_token", "state", "token_type", "expires_in", "expires_at", "provider_token", "provider_refresh_token"].forEach(
            (k) => url.searchParams.delete(k),
          );
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        }
      } catch (err) {
        console.error("[Auth] OAuth callback consume failed:", err);
      }
    };
    void consumeOAuthCallback();

    // Set up the listener first so we never miss a SIGNED_IN event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
      setLoading(false);
    });

    // Then read the current session (handles initial page load).
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      applySession(initialSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
