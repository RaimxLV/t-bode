const TOKEN_REFRESH_REUSE_MS = 10_000;
const TOKEN_REFRESH_CACHE_PREFIX = "tbode:auth-refresh-cache:";

type CachedRefresh = {
  body: unknown;
  status: number;
  statusText: string;
  expiresAt: number;
};

type RefreshRequest = {
  isRefresh: boolean;
  key: string;
};

declare global {
  interface Window {
    __tbodeAuthRefreshGuardInstalled?: boolean;
  }
}

const cachedRefreshes = new Map<string, CachedRefresh>();
const inFlightRefreshes = new Map<string, Promise<Response>>();

const hashText = async (value: string) => {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv-${(hash >>> 0).toString(16)}-${value.length}`;
  }
};

const refreshKeyFromBody = async (bodyText: string) => {
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.refresh_token) return `json:${await hashText(parsed.refresh_token)}`;
  } catch {
    // URL encoded bodies are handled below.
  }

  const params = new URLSearchParams(bodyText);
  const refreshToken = params.get("refresh_token");
  return refreshToken ? `form:${await hashText(refreshToken)}` : `body:${await hashText(bodyText)}`;
};

const getRefreshRequest = async (input: RequestInfo | URL, init?: RequestInit): Promise<RefreshRequest> => {
  try {
    const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const url = new URL(requestUrl, window.location.origin);
    if (!url.pathname.endsWith("/auth/v1/token") && !url.pathname.endsWith("/token")) {
      return { isRefresh: false, key: "" };
    }

    const body = init?.body;
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const key = typeof body === "string"
        ? await refreshKeyFromBody(body)
        : body instanceof URLSearchParams
          ? `form:${await hashText(body.get("refresh_token") ?? body.toString())}`
          : `url:${await hashText(url.toString())}`;
      return { isRefresh: true, key };
    }

    if (typeof body === "string") {
      const isRefresh = body.includes("grant_type=refresh_token") || body.includes('"grant_type":"refresh_token"');
      return { isRefresh, key: isRefresh ? await refreshKeyFromBody(body) : "" };
    }

    if (body instanceof URLSearchParams) {
      const isRefresh = body.get("grant_type") === "refresh_token";
      return { isRefresh, key: isRefresh ? `form:${await hashText(body.get("refresh_token") ?? body.toString())}` : "" };
    }

    if (input instanceof Request && input.method !== "GET") {
      const text = await input.clone().text().catch(() => "");
      const isRefresh = text.includes("grant_type=refresh_token") || text.includes('"grant_type":"refresh_token"');
      return { isRefresh, key: isRefresh ? await refreshKeyFromBody(text) : "" };
    }
  } catch {
    return { isRefresh: false, key: "" };
  }

  return { isRefresh: false, key: "" };
};

const responseFromCache = (cached: CachedRefresh) =>
  new Response(JSON.stringify(cached.body), {
    status: cached.status,
    statusText: cached.statusText,
    headers: { "Content-Type": "application/json" },
  });

const getLocalCachedRefresh = (key: string) => {
  try {
    const raw = window.localStorage.getItem(`${TOKEN_REFRESH_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedRefresh;
    if (cached.expiresAt > Date.now()) return cached;
    window.localStorage.removeItem(`${TOKEN_REFRESH_CACHE_PREFIX}${key}`);
  } catch {
    // Ignore unavailable storage or malformed cache entries.
  }
  return null;
};

const setLocalCachedRefresh = (key: string, cached: CachedRefresh) => {
  try {
    window.localStorage.setItem(`${TOKEN_REFRESH_CACHE_PREFIX}${key}`, JSON.stringify(cached));
    window.setTimeout(() => {
      try {
        const current = getLocalCachedRefresh(key);
        if (!current || current.expiresAt <= Date.now()) {
          window.localStorage.removeItem(`${TOKEN_REFRESH_CACHE_PREFIX}${key}`);
        }
      } catch {
        // Ignore cleanup failures.
      }
    }, TOKEN_REFRESH_REUSE_MS + 500);
  } catch {
    // Ignore quota/storage failures; in-memory cache still works for this tab.
  }
};

const getCachedRefresh = (key: string) => {
  const now = Date.now();
  const cachedRefresh = cachedRefreshes.get(key);
  if (cachedRefresh?.expiresAt && cachedRefresh.expiresAt > now) return cachedRefresh;
  if (cachedRefresh) cachedRefreshes.delete(key);
  const localCachedRefresh = getLocalCachedRefresh(key);
  if (localCachedRefresh) {
    cachedRefreshes.set(key, localCachedRefresh);
    return localCachedRefresh;
  }
  return null;
};

const runWithBrowserRefreshLock = async (key: string, refresh: () => Promise<Response>) => {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (!locks?.request) return refresh();

  return locks.request(`tbode-auth-refresh-${key}`, { mode: "exclusive" }, async () => {
    const cachedRefresh = getCachedRefresh(key);
    if (cachedRefresh) {
      console.info("[Auth] Reusing token refresh response after cross-tab wait");
      return responseFromCache(cachedRefresh);
    }
    return refresh();
  });
};

export const installAuthRefreshGuard = () => {
  if (typeof window === "undefined") return;
  if (window.__tbodeAuthRefreshGuardInstalled) return;
  window.__tbodeAuthRefreshGuardInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const refreshRequest = await getRefreshRequest(input, init);
    if (!refreshRequest.isRefresh) return nativeFetch(input, init);

    const refreshKey = refreshRequest.key || "unknown-refresh-request";

    const cachedRefresh = getCachedRefresh(refreshKey);
    if (cachedRefresh) {
      console.info("[Auth] Reusing duplicate token refresh response");
      return responseFromCache(cachedRefresh);
    }

    const inFlightRefresh = inFlightRefreshes.get(refreshKey);
    if (inFlightRefresh) {
      console.info("[Auth] Joining in-flight token refresh");
      return inFlightRefresh.then((response) => response.clone());
    }

    const refreshPromise = runWithBrowserRefreshLock(refreshKey, () => nativeFetch(input, init))
      .then(async (response) => {
        const clone = response.clone();
        const body = await clone.json().catch(() => null);

        if (body && response.ok) {
          const cached = {
            body,
            status: response.status,
            statusText: response.statusText,
            expiresAt: Date.now() + TOKEN_REFRESH_REUSE_MS,
          };
          cachedRefreshes.set(refreshKey, cached);
          setLocalCachedRefresh(refreshKey, cached);
        }

        return response;
      })
      .finally(() => {
        inFlightRefreshes.delete(refreshKey);
      });

    inFlightRefreshes.set(refreshKey, refreshPromise);
    return refreshPromise.then((response) => response.clone());
  };
};
