import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { publicAnalyticsPath, safeAnalyticsReferrer } from "@/lib/analyticsPolicy";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const GA_ID = "G-09YMNHC0BF";

/**
 * Sends a GA4 page_view on every SPA route change.
 * Consent mode defaults are set in index.html. Denied analytics_storage
 * prevents analytics cookies, but advanced consent mode can send cookieless
 * pings; it does not mean every event is dropped.
 */
export const GaPageviews = () => {
  const location = useLocation();
  useEffect(() => {
    window.gtag?.("set", {
      page_location: window.location.origin + (publicAnalyticsPath(location.pathname, location.search) || "/"),
      page_referrer: safeAnalyticsReferrer(document.referrer),
      page_title: "T-Bode",
    });
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const path = publicAnalyticsPath(location.pathname, location.search);
    if (!path) return;
    let sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sendWhenReady = () => {
      // A lazy route may still show the previous document.title. Seo announces
      // the resolved title only for its currently mounted pathname.
      const ready = document.documentElement.dataset.analyticsPath;
      const title = document.documentElement.dataset.analyticsTitle;
      if (sent || ready !== location.pathname || !title) return;
      if (document.querySelector('meta[name="robots"]')?.getAttribute("content")?.includes("noindex")) return;
      sent = true;
      window.gtag?.("event", "page_view", {
        send_to: GA_ID,
        page_path: path,
        page_location: window.location.origin + path,
        page_title: title,
        page_referrer: safeAnalyticsReferrer(document.referrer),
      });
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(sendWhenReady, 0);
    };
    window.addEventListener("tbode:seo-ready", schedule);
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("tbode:seo-ready", schedule);
    };
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