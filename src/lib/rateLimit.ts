/**
 * Client-side rate limiter using localStorage.
 * NOTE: This is a soft front-line defence against casual abuse and bots.
 * For real protection, server-side rate limiting (e.g. Supabase edge function
 * with IP-based throttling, or Cloudflare Turnstile) should also be applied.
 */

interface RateLimitOptions {
  /** Unique key per action, e.g. "contact_submit" */
  key: string;
  /** Max attempts allowed within the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Seconds until next attempt is allowed (only set when blocked) */
  retryAfter?: number;
}

const STORAGE_PREFIX = "rl_";

export const checkRateLimit = ({ key, max, windowMs }: RateLimitOptions): RateLimitResult => {
  if (typeof window === "undefined") return { allowed: true };
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const now = Date.now();
  let attempts: number[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) attempts = JSON.parse(raw) as number[];
  } catch {
    attempts = [];
  }
  // Drop attempts outside the window
  attempts = attempts.filter((ts) => now - ts < windowMs);

  if (attempts.length >= max) {
    const oldest = attempts[0];
    const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, retryAfter };
  }

  attempts.push(now);
  try {
    localStorage.setItem(storageKey, JSON.stringify(attempts));
  } catch {
    // Quota exceeded or disabled — fail open
  }
  return { allowed: true };
};

export const resetRateLimit = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // ignore
  }
};
