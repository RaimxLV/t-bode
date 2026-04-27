import { supabase } from "@/integrations/supabase/client";

const SCRIPT_URL =
  "https://portal.zakeke.com/scripts/integration/apiV2/customizer.js";
const TOKEN_STORAGE_KEY = "zakeke-token-cache";
const VISITOR_KEY = "zakeke-visitor";

let scriptPromise: Promise<void> | null = null;
let tokenPromise: Promise<string> | null = null;

interface CachedToken {
  token: string;
  /** Epoch ms when the cached token should be considered expired. */
  expiresAt: number;
  visitor: string;
}

function getVisitorCode(): string {
  let code = localStorage.getItem(VISITOR_KEY);
  if (!code) {
    code = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, code);
  }
  return code;
}

function readCachedToken(visitor: string): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedToken;
    if (
      parsed?.token &&
      parsed.visitor === visitor &&
      // 30s safety buffer
      parsed.expiresAt - Date.now() > 30_000
    ) {
      return parsed.token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedToken(token: string, visitor: string, expiresInSec: number) {
  try {
    const cached: CachedToken = {
      token,
      visitor,
      expiresAt: Date.now() + expiresInSec * 1000,
    };
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* ignore quota errors */
  }
}

/** Load the Zakeke customizer script once. Reuses an in-flight promise. */
export function loadZakekeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { ZakekeDesigner?: unknown }).ZakekeDesigner) {
    return Promise.resolve();
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          scriptPromise = null;
          reject(new Error("Failed to load Zakeke script"));
        },
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Zakeke script"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function requestToken(visitor: string): Promise<{ token: string; expiresIn: number }> {
  const { data, error } = await supabase.functions.invoke("zakeke-token", {
    body: { visitorCode: visitor },
  });
  if (error || !data?.access_token) {
    throw new Error(error?.message || "Failed to get Zakeke token");
  }
  // Zakeke OAuth returns expires_in (seconds). Default to 25 min if missing.
  const expiresIn = Number(data.expires_in) || 1500;
  return { token: data.access_token as string, expiresIn };
}

/**
 * Get a Zakeke OAuth token. Uses sessionStorage cache + de-duplicates concurrent
 * requests + retries once on transient network failures.
 */
export function getZakekeToken(): Promise<string> {
  const visitor = getVisitorCode();
  const cached = readCachedToken(visitor);
  if (cached) return Promise.resolve(cached);

  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { token, expiresIn } = await requestToken(visitor);
        writeCachedToken(token, visitor, expiresIn);
        return token;
      } catch (err) {
        lastErr = err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Failed to get Zakeke token");
  })().finally(() => {
    tokenPromise = null;
  });

  return tokenPromise;
}

/**
 * Fire-and-forget warm-up: starts loading the Zakeke script and fetching a token
 * in parallel so the customizer opens nearly instantly when the user clicks.
 * Safe to call multiple times.
 */
export function prefetchZakeke(): void {
  // Don't await — we just want the requests to start.
  loadZakekeScript().catch(() => {
    /* ignore */
  });
  getZakekeToken().catch(() => {
    /* ignore */
  });
}

/** Clear the cached token (e.g. after a 401 response). */
export function clearZakekeTokenCache(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
