import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_KEY = "tbode_cookie_consent";

export const CookieConsent = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-2 sm:p-4 md:p-6 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 pointer-events-auto">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-primary/10 items-center justify-center flex-shrink-0 mt-0.5">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base sm:text-lg mb-1">
                  {t("cookies.title", "Sīkdatņu izmantošana")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed mb-3 sm:mb-4">
                  {t(
                    "cookies.description",
                    "Mēs izmantojam sīkdatnes, lai uzlabotu jūsu pārlūkošanas pieredzi, analizētu vietnes apmeklējumu un nodrošinātu vietnes funkcionalitāti. Turpinot lietot šo vietni, jūs piekrītat sīkdatņu izmantošanai."
                  )}{" "}
                  <Link
                    to="/privacy"
                    className="underline text-foreground hover:text-primary transition-colors"
                  >
                    {t("cookies.learnMore", "Uzzināt vairāk")}
                  </Link>
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={accept}
                    className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold font-body text-white transition-all hover:scale-105 bg-cta-red"
                  >
                    {t("cookies.accept", "Pieņemt visas")}
                  </button>
                  <button
                    onClick={decline}
                    className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold font-body border border-border text-foreground hover:bg-muted transition-all"
                  >
                    {t("cookies.decline", "Tikai nepieciešamās")}
                  </button>
                </div>
              </div>
              <button
                onClick={decline}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Close"
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
