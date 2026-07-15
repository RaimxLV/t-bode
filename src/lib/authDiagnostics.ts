const DIAGNOSTIC_STORAGE_KEY = "tbode:auth-diagnostics";

export type AuthDiagnosticEvent = {
  time: string;
  source: string;
  message: string;
  data?: Record<string, unknown>;
};

export const getStoredDiagnosticEvents = (): AuthDiagnosticEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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