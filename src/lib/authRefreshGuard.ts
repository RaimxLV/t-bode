const TOKEN_REFRESH_CACHE_MS = 25_000;
const TOKEN_REFRESH_ERROR_CACHE_MS = 3_000;

type CachedRefresh = {
  body: unknown;
  status: number;
  statusText: string;
  expiresAt: number;
};

let cachedRefresh: CachedRefresh | null = null;
let inFlightRefresh: Promise<Response> | null = null;

const isRefreshTokenRequest = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const url = new URL(requestUrl, window.location.origin);
    if (!url.pathname.endsWith("/auth/v1/token") && !url.pathname.endsWith("/token")) return false;
    if (url.searchParams.get("grant_type") === "refresh_token") return true;

    const body = init?.body;
    if (typeof body === "string") return body.includes("grant_type=refresh_token") || body.includes('"grant_type":"refresh_token"');
    if (body instanceof URLSearchParams) return body.get("grant_type") === "refresh_token";

    if (input instanceof Request && input.method !== "GET") {
      const text = await input.clone().text().catch(() => "");
      return text.includes("grant_type=refresh_token") || text.includes('"grant_type":"refresh_token"');
    }
  } catch {
    return false;
  }

  return false;
};

const responseFromCache = (cached: CachedRefresh) =>
  new Response(JSON.stringify(cached.body), {
    status: cached.status,
    statusText: cached.statusText,
    headers: { "Content-Type": "application/json" },
  });

export const installAuthRefreshGuard = () => {
  if (typeof window === "undefined") return;
  const marker = "__tbodeAuthRefreshGuardInstalled";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const isRefresh = await isRefreshTokenRequest(input, init);
    if (!isRefresh) return nativeFetch(input, init);

    const now = Date.now();
    if (cachedRefresh && cachedRefresh.expiresAt > now) {
      console.info("[Auth] Reusing recent token refresh response");
      return responseFromCache(cachedRefresh);
    }

    if (inFlightRefresh) {
      console.info("[Auth] Joining in-flight token refresh");
      return inFlightRefresh.then((response) => response.clone());
    }

    inFlightRefresh = nativeFetch(input, init)
      .then(async (response) => {
        const clone = response.clone();
        const body = await clone.json().catch(() => null);

        if (body && (response.ok || response.status === 429)) {
          cachedRefresh = {
            body,
            status: response.status,
            statusText: response.statusText,
            expiresAt: Date.now() + (response.ok ? TOKEN_REFRESH_CACHE_MS : TOKEN_REFRESH_ERROR_CACHE_MS),
          };
        }

        return response;
      })
      .finally(() => {
        inFlightRefresh = null;
      });

    return inFlightRefresh.then((response) => response.clone());
  };
};
