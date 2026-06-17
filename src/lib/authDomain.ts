export const CANONICAL_AUTH_ORIGIN = "https://t-bode.lv";

export const getAuthRedirectOrigin = () => {
  if (typeof window === "undefined") return CANONICAL_AUTH_ORIGIN;

  const host = window.location.hostname.toLowerCase();
  if (host === "t-bode.lv" || host === "www.t-bode.lv") {
    return CANONICAL_AUTH_ORIGIN;
  }

  return window.location.origin;
};

export const redirectToCanonicalHost = () => {
  if (typeof window === "undefined") return false;

  if (window.location.hostname.toLowerCase() !== "www.t-bode.lv") {
    return false;
  }

  // CRITICAL: Never redirect across origins while an OAuth callback is being
  // processed. localStorage is per-origin, so a hop from www.t-bode.lv to
  // t-bode.lv would discard the session that was just stored.
  const search = window.location.search || "";
  const hash = window.location.hash || "";
  const hasOAuthPayload =
    /[?&#](access_token|refresh_token|provider_token|code|error|error_description)=/.test(
      search + "&" + hash.replace(/^#/, "&"),
    );
  if (hasOAuthPayload) {
    console.info("[Auth] Skipping canonical-host redirect: OAuth params present", {
      href: window.location.href,
    });
    return false;
  }

  const nextUrl = `${CANONICAL_AUTH_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(nextUrl);
  return true;
};