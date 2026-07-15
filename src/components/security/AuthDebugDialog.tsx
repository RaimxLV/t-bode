import { useMemo, useState } from "react";
import { Bug, Clipboard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const DIAGNOSTIC_STORAGE_KEY = "tbode:auth-diagnostics";

type AuthDiagnosticEvent = {
  time: string;
  source: string;
  message: string;
  data?: Record<string, unknown>;
};

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const getStoredDiagnosticEvents = (): AuthDiagnosticEvent[] => {
  try {
    const raw = window.sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getAuthStorageSummary = () => {
  try {
    return Object.keys(window.localStorage)
      .filter((key) => key.startsWith("sb-") || key.includes("supabase"))
      .map((key) => {
        const raw = window.localStorage.getItem(key);
        let parsed: any = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = null;
        }
        const session = parsed?.currentSession ?? parsed;
        return {
          key,
          hasAccessToken: !!session?.access_token,
          hasRefreshToken: !!session?.refresh_token,
          hasUser: !!session?.user,
          userEmail: session?.user?.email ?? null,
          expiresAt: session?.expires_at ?? null,
          rawLength: raw?.length ?? 0,
        };
      });
  } catch (error) {
    return [{ error: error instanceof Error ? error.message : String(error) }];
  }
};

export const recordAuthDiagnostic = (source: string, message: string, data?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  try {
    const events = getStoredDiagnosticEvents();
    const next = [
      ...events,
      {
        time: new Date().toISOString(),
        source,
        message,
        data,
      },
    ].slice(-40);
    window.sessionStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Diagnostics must never break auth.
  }
};

export const AuthDebugDialog = () => {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [serverSession, setServerSession] = useState<Record<string, unknown> | null>(null);
  const [serverUser, setServerUser] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<AuthDiagnosticEvent[]>(() => getStoredDiagnosticEvents());

  const refresh = async () => {
    setChecking(true);
    try {
      const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);

      setServerSession({
        hasSession: !!sessionData.session,
        userEmail: sessionData.session?.user?.email ?? null,
        expiresAt: sessionData.session?.expires_at ?? null,
        error: sessionError?.message ?? null,
      });
      setServerUser({
        hasUser: !!userData.user,
        userEmail: userData.user?.email ?? null,
        userIdLast6: userData.user?.id?.slice(-6) ?? null,
        error: userError?.message ?? null,
      });
      setEvents(getStoredDiagnosticEvents());
    } finally {
      setChecking(false);
    }
  };

  const report = useMemo(() => {
    const payload = {
      url: window.location.href,
      host: window.location.host,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      appAuthState: {
        loading: auth.loading,
        adminLoading: auth.adminLoading,
        hasUser: !!auth.user,
        userEmail: auth.user?.email ?? null,
        isAdmin: auth.isAdmin,
        isWhitelisted: auth.isWhitelisted,
        hasSession: !!auth.session,
        expiresAt: auth.session?.expires_at ?? null,
      },
      serverSession,
      serverUser,
      authStorage: getAuthStorageSummary(),
      events,
    };
    return safeJson(payload);
  }, [auth, events, serverSession, serverUser]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Diagnostika nokopēta");
    } catch {
      toast.error("Neizdevās nokopēt");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) void refresh();
    }}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white/80 transition-colors">
          <Bug className="h-3.5 w-3.5" />
          Diagnostika
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Login diagnostika</DialogTitle>
          <DialogDescription>
            Šeit nav paroles vai piekļuves tokenu. Nokopē šo tekstu un atsūti, ja pieslēgšanās izmet ārā.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={report} readOnly className="min-h-[320px] font-mono text-xs" />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={refresh} disabled={checking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Atjaunot
          </Button>
          <Button type="button" onClick={copy}>
            <Clipboard className="mr-2 h-4 w-4" />
            Kopēt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};