import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const OAUTH_PENDING_STORAGE_KEY = "tbode.oauth.pending";

const hasOAuthReturnParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.has("code") ||
    searchParams.has("error") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error")
  );
};

const clearPendingOAuthFlag = () => {
  sessionStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
};

const cleanOAuthUrl = () => {
  const url = new URL(window.location.href);

  ["code", "state", "error", "error_code", "error_description", "provider_token", "provider_refresh_token"].forEach((key) => {
    url.searchParams.delete(key);
  });

  url.hash = "";

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl || "/");
};

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
  const hasResolvedInitialSession = useRef(false);

  const applySession = (nextSession: Session | null, options?: { allowFinishLoading?: boolean }) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      clearPendingOAuthFlag();
    }

    if (options?.allowFinishLoading) {
      setLoading(false);
      hasResolvedInitialSession.current = true;
    }

    if (nextSession?.user) {
      void checkAdmin(nextSession.user.id, nextSession.user.email ?? "");
      return;
    }

    setIsAdmin(false);
    setIsWhitelisted(false);
    setAdminLoading(false);
  };

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession, { allowFinishLoading: true });

      if (event === "SIGNED_OUT") {
        clearPendingOAuthFlag();
      }
    });

    const initializeAuth = async () => {
      const shouldRecoverOAuth = hasOAuthReturnParams() || sessionStorage.getItem(OAUTH_PENDING_STORAGE_KEY) === "1";

      if (shouldRecoverOAuth) {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        try {
          const code = searchParams.get("code");
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const hasOAuthError = searchParams.has("error") || hashParams.has("error");

          if (hasOAuthError) {
            clearPendingOAuthFlag();
            cleanOAuthUrl();
          } else if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            cleanOAuthUrl();
          } else if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            cleanOAuthUrl();
          }
        } catch (error) {
          console.error("OAuth session recovery failed:", error);
          clearPendingOAuthFlag();
          cleanOAuthUrl();
        }
      }

      const { data: { session: initialSession } } = await supabase.auth.getSession();
      applySession(initialSession, { allowFinishLoading: true });

      if (!initialSession?.user) {
        clearPendingOAuthFlag();
      }
    };

    void initializeAuth();

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
