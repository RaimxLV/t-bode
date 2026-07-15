import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { recordAuthDiagnostic } from "@/lib/authDiagnostics";

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

const AUTH_STORAGE_KEY_PREFIX = "sb-";
const AUTH_STORAGE_KEY_SUFFIX = "-auth-token";

const getStoredSession = (): Session | null => {
  if (typeof window === "undefined") return null;

  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(AUTH_STORAGE_KEY_PREFIX) || !key.endsWith(AUTH_STORAGE_KEY_SUFFIX)) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession ?? parsed;
      if (session?.access_token && session?.refresh_token && session?.user) {
        return session as Session;
      }
    }
  } catch (err) {
    console.warn("[Auth] Stored session fallback failed", err);
  }

  return null;
};

const isRecentSession = (session: Session | null) => {
  if (!session?.expires_at) return !!session;
  return session.expires_at * 1000 > Date.now() - 5 * 60 * 1000;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const lastKnownSessionRef = useRef<Session | null>(null);
  const explicitSignOutRef = useRef(false);
  const initializedRef = useRef(false);
  const adminCheckSeqRef = useRef(0);
  const adminCheckedUserIdRef = useRef<string | null>(null);
  const adminAccessRef = useRef({ isAdmin: false, isWhitelisted: false });
  const adminRetryTimerRef = useRef<number | null>(null);

  const clearAdminRetry = () => {
    if (adminRetryTimerRef.current) {
      window.clearTimeout(adminRetryTimerRef.current);
      adminRetryTimerRef.current = null;
    }
  };

  const resetAdminAccess = () => {
    adminCheckSeqRef.current += 1;
    adminCheckedUserIdRef.current = null;
    adminAccessRef.current = { isAdmin: false, isWhitelisted: false };
    clearAdminRetry();
    setIsAdmin(false);
    setIsWhitelisted(false);
  };

  const checkAdmin = async (userId: string, email: string, attempt = 0) => {
    clearAdminRetry();
    const seq = ++adminCheckSeqRef.current;
    let keepLoadingForRetry = false;
    setAdminLoading(true);

    try {
      const [roleResult, whitelistResult] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("is_admin_whitelisted", { _email: email }),
      ]);

      if (seq !== adminCheckSeqRef.current) return;

      const roleFailed = !!roleResult.error;
      const whitelistFailed = !!whitelistResult.error;
      const nextIsAdmin = roleFailed ? adminAccessRef.current.isAdmin : !!roleResult.data;
      const nextIsWhitelisted = whitelistFailed ? adminAccessRef.current.isWhitelisted : !!whitelistResult.data;

      if (roleFailed || whitelistFailed) {
        console.warn("[Auth] Admin access check partially failed", {
          roleError: roleResult.error?.message,
          whitelistError: whitelistResult.error?.message,
        });
        recordAuthDiagnostic("AuthContext", "Admin access check partially failed", {
          attempt,
          roleError: roleResult.error?.message ?? null,
          whitelistError: whitelistResult.error?.message ?? null,
          keptAdmin: nextIsAdmin,
          keptWhitelist: nextIsWhitelisted,
        });
      }

      adminAccessRef.current = { isAdmin: nextIsAdmin, isWhitelisted: nextIsWhitelisted };
      setIsAdmin(nextIsAdmin);
      setIsWhitelisted(nextIsWhitelisted);

      if ((roleFailed || whitelistFailed) && !nextIsAdmin && !nextIsWhitelisted && attempt < 3) {
        keepLoadingForRetry = true;
        adminRetryTimerRef.current = window.setTimeout(() => {
          void checkAdmin(userId, email, attempt + 1);
        }, 900 * (attempt + 1));
        return;
      }

      adminCheckedUserIdRef.current = userId;
    } catch {
      if (seq !== adminCheckSeqRef.current) return;

      const hadAccess = adminAccessRef.current.isAdmin || adminAccessRef.current.isWhitelisted;
      console.warn("[Auth] Admin access check failed; keeping previous access state if already verified");
      recordAuthDiagnostic("AuthContext", "Admin access check threw", {
        attempt,
        hadAccess,
      });

      if (!hadAccess && attempt < 3) {
        keepLoadingForRetry = true;
        adminRetryTimerRef.current = window.setTimeout(() => {
          void checkAdmin(userId, email, attempt + 1);
        }, 900 * (attempt + 1));
        return;
      }
    } finally {
      if (seq === adminCheckSeqRef.current && !keepLoadingForRetry) setAdminLoading(false);
    }
  };

  const applySession = (nextSession: Session | null) => {
    if (!nextSession && !explicitSignOutRef.current && isRecentSession(lastKnownSessionRef.current)) {
      console.warn("[Auth] Ignored transient empty session; keeping last known session");
      recordAuthDiagnostic("AuthContext", "Ignored transient empty session", {
        lastKnownUserEmail: lastKnownSessionRef.current?.user?.email ?? null,
        lastKnownExpiresAt: lastKnownSessionRef.current?.expires_at ?? null,
      });
      setLoading(false);
      return;
    }

    if (nextSession) {
      lastKnownSessionRef.current = nextSession;
      explicitSignOutRef.current = false;
    } else {
      lastKnownSessionRef.current = null;
    }

    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    recordAuthDiagnostic("AuthContext", "Applied session", {
      hasSession: !!nextSession,
      userEmail: nextSession?.user?.email ?? null,
      expiresAt: nextSession?.expires_at ?? null,
      explicitSignOut: explicitSignOutRef.current,
    });

    if (nextSession?.user) {
      if (adminCheckedUserIdRef.current !== nextSession.user.id) {
        resetAdminAccess();
        void checkAdmin(nextSession.user.id, nextSession.user.email ?? "");
      }
    } else {
      resetAdminAccess();
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

      if (event === "INITIAL_SESSION" && !nextSession && !initializedRef.current) {
        console.info("[Auth] Waiting for explicit session restore before marking auth ready");
        return;
      }

      applySession(nextSession ?? getStoredSession());
      setLoading(false);
    });

    const initializeAuth = async () => {
      cleanupOAuthErrorParams();
      const storedSession = getStoredSession();
      if (storedSession) {
        lastKnownSessionRef.current = storedSession;
        applySession(storedSession);
        setLoading(false);
      }

      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (!mounted) return;
      initializedRef.current = true;
      if (error) console.warn("[Auth] getSession failed; using stored session if available", error.message);
      recordAuthDiagnostic("AuthContext", "Initial getSession completed", {
        hasCurrentSession: !!currentSession,
        hasStoredSession: !!storedSession,
        error: error?.message ?? null,
      });
      applySession(currentSession ?? storedSession);
      setLoading(false);
    };

    void initializeAuth();

    return () => {
      mounted = false;
      clearAdminRetry();
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    explicitSignOutRef.current = true;
    lastKnownSessionRef.current = null;
    resetAdminAccess();
    recordAuthDiagnostic("AuthContext", "Explicit sign out requested");
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
