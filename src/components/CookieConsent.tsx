import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { grantAnalyticsConsent, denyAnalyticsConsent } from "@/components/GaPageviews";

const COOKIE_KEY = "tbode_cookie_consent";
const HIDDEN_ROUTES = ["/auth", "/checkout", "/payment-success"];

export const CookieConsent = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const isEmbeddedPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  useEffect(() => {
    if (isEmbeddedPreview) {
      setVisible(false);
      return;
    }
    if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) {
      setVisible(false);
      return;
    }
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      let timer: number | undefined;
      let idleCallback: number | undefined;
      const reveal = () => {
        const schedule = () => {
          timer = window.setTimeout(() => setVisible(true), 500);
        };
        if ("requestIdleCallback" in window) {
          idleCallback = window.requestIdleCallback(schedule, { timeout: 2000 });
        } else {
          schedule();
        }
      };

      if (document.readyState === "complete") reveal();
      else window.addEventListener("load", reveal, { once: true });

      return () => {
        window.removeEventListener("load", reveal);
        if (timer) window.clearTimeout(timer);
        if (idleCallback && "cancelIdleCallback" in window) window.cancelIdleCallback(idleCallback);
      };
    }
  }, [isEmbeddedPreview, location.pathname]);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    grantAnalyticsConsent();
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    denyAnalyticsConsent();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-2 sm:p-4 md:p-6 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 pointer-events-auto">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-primary/10 items-center justify-center flex-shrink-0 mt-0.5">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base sm:text-lg mb-1">
                  {t("cookies.title")}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed mb-3 sm:mb-4">
                  {t("cookies.description")}{" "}
                  <Link
                    to="/privacy"
                    className="underline text-foreground hover:text-primary transition-colors"
                  >
                    {t("cookies.learnMore")}
                  </Link>
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={accept}
                    className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold font-body text-white transition-all hover:scale-105 bg-cta-red"
                  >
                    {t("cookies.accept")}
                  </button>
                  <button
                    onClick={decline}
                    className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold font-body border border-border text-foreground hover:bg-muted transition-all"
                  >
                    {t("cookies.decline")}
                  </button>
                </div>
              </div>
              <button
                onClick={decline}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label={t("cookies.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
