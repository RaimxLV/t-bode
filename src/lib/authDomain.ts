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

  const nextUrl = `${CANONICAL_AUTH_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(nextUrl);
  return true;
};