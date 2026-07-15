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
    if (!nextSession && !explicitSignOutRef.current && isRecentSession(lastKnownSessionRef.current)) {
      console.warn("[Auth] Ignored transient empty session; keeping last known session");
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
      applySession(currentSession ?? storedSession);
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
    explicitSignOutRef.current = true;
    lastKnownSessionRef.current = null;
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
