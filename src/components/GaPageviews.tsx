import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const GA_ID = "G-09YMNHC0BF";

/**
 * Sends a GA4 page_view on every SPA route change.
 * Consent gating is handled by the gtag consent-mode defaults in index.html;
 * events are dropped by GA until analytics_storage is granted.
 */
export const GaPageviews = () => {
  const location = useLocation();
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const path = location.pathname + location.search;
    window.gtag("event", "page_view", {
      send_to: GA_ID,
      page_path: path,
      page_location: window.location.origin + path,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);
  return null;
};

/** Call from cookie consent handler when the user accepts analytics. */
export const grantAnalyticsConsent = () => {
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
};

/** Call when the user declines. */
export const denyAnalyticsConsent = () => {
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
};