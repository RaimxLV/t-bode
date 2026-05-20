import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const OAUTH_PENDING_STORAGE_KEY = "tbode.oauth.pending";
const OAUTH_RETURN_PATH_KEY = "tbode.oauth.returnPath";

const readOAuthStorage = (key: string) => sessionStorage.getItem(key) ?? localStorage.getItem(key);

const removeOAuthStorage = (key: string) => {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

const hasOAuthReturnParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.has("code") ||
    searchParams.has("access_token") ||
    searchParams.has("refresh_token") ||
    searchParams.has("error") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error")
  );
};

const hasOAuthErrorParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return searchParams.has("error") || hashParams.has("error");
};

const clearPendingOAuthFlag = () => {
  removeOAuthStorage(OAUTH_PENDING_STORAGE_KEY);
};

const cleanOAuthUrl = () => {
  const url = new URL(window.location.href);

  ["code", "state", "error", "error_code", "error_description", "provider_token", "provider_refresh_token"].forEach((key) => {
    url.searchParams.delete(key);
  });

  ["access_token", "refresh_token", "expires_in", "expires_at", "token_type"].forEach((key) => {
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
  const isInitializingAuth = useRef(true);
  const latestSessionRef = useRef<Session | null>(null);

  const applySession = (nextSession: Session | null, options?: { allowFinishLoading?: boolean }) => {
    latestSessionRef.current = nextSession;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      clearPendingOAuthFlag();
      setAdminLoading(true);
    }

    if (options?.allowFinishLoading) {
      setLoading(false);
      isInitializingAuth.current = false;
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
      console.info("[auth] state change", {
        event,
        hasUser: !!nextSession?.user,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash ? "#present" : "",
      });

      if (isInitializingAuth.current) {
        if (event !== "INITIAL_SESSION") {
          applySession(nextSession);
        }
      } else {
        applySession(nextSession, { allowFinishLoading: true });
      }

      if (event === "SIGNED_OUT") {
        clearPendingOAuthFlag();
        removeOAuthStorage(OAUTH_RETURN_PATH_KEY);
      }
    });

    const initializeAuth = async () => {
      const hasPendingManagedOAuth = readOAuthStorage(OAUTH_PENDING_STORAGE_KEY) === "1";
      const oauthReturnParamsPresent = hasOAuthReturnParams();
      const oauthErrorPresent = hasOAuthErrorParams();
      const shouldWaitForOAuth = oauthReturnParamsPresent || hasPendingManagedOAuth;

      const waitForManagedOAuthSession = async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const { data: { session: polledSession } } = await supabase.auth.getSession();
          if (polledSession?.user) return polledSession;
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }

        return null;
      };

      console.info("[auth] initialize", {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash ? "#present" : "",
        hasPendingManagedOAuth,
        shouldRecoverOAuth: shouldWaitForOAuth,
      });

      if (oauthErrorPresent) {
        clearPendingOAuthFlag();
        removeOAuthStorage(OAUTH_RETURN_PATH_KEY);
        cleanOAuthUrl();
      }

      let { data: { session: initialSession } } = await supabase.auth.getSession();

      if (!initialSession?.user && shouldWaitForOAuth && !oauthErrorPresent) {
        console.info("[auth] waiting for pending managed oauth session");
        initialSession = await waitForManagedOAuthSession();
      }

      console.info("[auth] getSession resolved", {
        hasSession: !!initialSession?.user,
        pendingOAuth: hasPendingManagedOAuth,
        hasReturnParams: oauthReturnParamsPresent,
      });
      const resolvedSession = initialSession?.user ? initialSession : latestSessionRef.current ?? initialSession;
      applySession(resolvedSession, { allowFinishLoading: true });

      if (resolvedSession?.user && oauthReturnParamsPresent) {
        cleanOAuthUrl();
      }

      if (resolvedSession?.user && (hasPendingManagedOAuth || oauthReturnParamsPresent)) {
        clearPendingOAuthFlag();
        const returnPath = readOAuthStorage(OAUTH_RETURN_PATH_KEY);
        removeOAuthStorage(OAUTH_RETURN_PATH_KEY);

        const nextPath = !returnPath || returnPath === "/auth" || returnPath.startsWith("/auth?")
          ? "/"
          : returnPath;

        if (nextPath !== window.location.pathname + window.location.search) {
          window.history.replaceState({}, "", nextPath);
        }
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
    clearPendingOAuthFlag();
    removeOAuthStorage(OAUTH_RETURN_PATH_KEY);
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
