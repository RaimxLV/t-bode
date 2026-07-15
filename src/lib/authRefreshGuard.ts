const TOKEN_REFRESH_REUSE_MS = 2_000;

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

const cachedRefreshes = new Map<string, CachedRefresh>();
const inFlightRefreshes = new Map<string, Promise<Response>>();

const refreshKeyFromBody = (bodyText: string) => {
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.refresh_token) return `json:${parsed.refresh_token}`;
  } catch {
    // URL encoded bodies are handled below.
  }

  const params = new URLSearchParams(bodyText);
  const refreshToken = params.get("refresh_token");
  return refreshToken ? `form:${refreshToken}` : bodyText;
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
        ? refreshKeyFromBody(body)
        : body instanceof URLSearchParams
          ? `form:${body.get("refresh_token") ?? body.toString()}`
          : url.toString();
      return { isRefresh: true, key };
    }

    if (typeof body === "string") {
      const isRefresh = body.includes("grant_type=refresh_token") || body.includes('"grant_type":"refresh_token"');
      return { isRefresh, key: isRefresh ? refreshKeyFromBody(body) : "" };
    }

    if (body instanceof URLSearchParams) {
      const isRefresh = body.get("grant_type") === "refresh_token";
      return { isRefresh, key: isRefresh ? `form:${body.get("refresh_token") ?? body.toString()}` : "" };
    }

    if (input instanceof Request && input.method !== "GET") {
      const text = await input.clone().text().catch(() => "");
      const isRefresh = text.includes("grant_type=refresh_token") || text.includes('"grant_type":"refresh_token"');
      return { isRefresh, key: isRefresh ? refreshKeyFromBody(text) : "" };
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

export const installAuthRefreshGuard = () => {
  if (typeof window === "undefined") return;
  const marker = "__tbodeAuthRefreshGuardInstalled";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const refreshRequest = await getRefreshRequest(input, init);
    if (!refreshRequest.isRefresh) return nativeFetch(input, init);

    const refreshKey = refreshRequest.key || "unknown-refresh-request";

    const now = Date.now();
    const cachedRefresh = cachedRefreshes.get(refreshKey);
    if (cachedRefresh?.expiresAt && cachedRefresh.expiresAt > now) {
      console.info("[Auth] Reusing duplicate token refresh response");
      return responseFromCache(cachedRefresh);
    }

    const inFlightRefresh = inFlightRefreshes.get(refreshKey);
    if (inFlightRefresh) {
      console.info("[Auth] Joining in-flight token refresh");
      return inFlightRefresh.then((response) => response.clone());
    }

    const refreshPromise = nativeFetch(input, init)
      .then(async (response) => {
        const clone = response.clone();
        const body = await clone.json().catch(() => null);

        if (body && response.ok) {
          cachedRefreshes.set(refreshKey, {
            body,
            status: response.status,
            statusText: response.statusText,
            expiresAt: Date.now() + TOKEN_REFRESH_REUSE_MS,
          });
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
