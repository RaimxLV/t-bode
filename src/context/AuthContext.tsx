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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdmin(session.user.id, session.user.email ?? "");
      } else {
        setIsAdmin(false);
        setIsWhitelisted(false);
        setAdminLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdmin(session.user.id, session.user.email ?? "");
      } else {
        setAdminLoading(false);
      }
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
