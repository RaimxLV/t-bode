const MOBILE_OAUTH_VIEWPORT_FLAG = "tbode:mobile-oauth-viewport";

const getMobileLayoutWidth = () => {
  if (typeof window === "undefined") return 390;

  const visualViewportWidth = window.visualViewport
    ? Math.round(window.visualViewport.width * (window.visualViewport.scale || 1))
    : 0;

  const candidates = [
    visualViewportWidth,
    window.screen?.width || 0,
    document.documentElement?.clientWidth || 0,
  ].filter((width) => width >= 320 && width <= 1024);

  return candidates.length ? Math.min(...candidates) : Math.min(Math.max(window.innerWidth || 390, 320), 1024);
};

export const getMobileLockedViewport = () =>
  `width=${getMobileLayoutWidth()}, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`;

export const getDefaultViewport = () => "width=device-width, initial-scale=1.0, viewport-fit=cover";

export const isMobileLikeViewport = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const narrowLayout = window.matchMedia?.("(max-width: 900px)").matches;
  const touchTablet = navigator.maxTouchPoints > 1 && (window.screen?.width || window.innerWidth) <= 1024;
  return !!(mobileUa || narrowLayout || touchTablet);
};

export const applyMobileViewportLock = () => {
  if (typeof document === "undefined" || !isMobileLikeViewport()) return false;

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) return false;

  const content = getMobileLockedViewport();
  viewportMeta.setAttribute("content", content);
  document.documentElement.style.width = "100%";
  document.documentElement.style.minWidth = "0";
  if (document.body) {
    document.body.style.width = "100%";
    document.body.style.minWidth = "0";
    document.body.style.overflowX = "hidden";
  }

  requestAnimationFrame(() => viewportMeta.setAttribute("content", getMobileLockedViewport()));
  setTimeout(() => viewportMeta.setAttribute("content", getMobileLockedViewport()), 250);
  return true;
};

export const markMobileOAuthViewportReturn = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MOBILE_OAUTH_VIEWPORT_FLAG, String(Date.now()));
  } catch {
    // Ignore unavailable storage.
  }
  applyMobileViewportLock();
};

export const hasMobileOAuthViewportReturn = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(MOBILE_OAUTH_VIEWPORT_FLAG) !== null;
  } catch {
    return false;
  }
};