import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Smartphone, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { HowItWorksFrame } from "./how-it-works/HowItWorksFrame";

export const HowItWorksSection = () => {
  const { t } = useTranslation();
  const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const [installing, setInstalling] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        // Keep installing animation visible longer for tactile feel
        setTimeout(() => {
          setInstalling(false);
          setJustInstalled(true);
        }, 1800);
      } else {
        setTimeout(() => setInstalling(false), 800);
      }
    } catch {
      setInstalling(false);
    }
  };

  const handleManualInstall = (e: React.MouseEvent) => {
    e.preventDefault();
    setInstalling(true);
    // Longer animation, then navigate to manual instructions
    setTimeout(() => {
      setInstalling(false);
      navigate("/install");
    }, 2200);
  };

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#000" }}>
      {/* Section heading */}
      <div className="container mx-auto px-4 mb-3 md:mb-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white tracking-tight mb-4">
            {t("about.howItWorks", "KĀ TAS STRĀDĀ")}
          </h2>
          <p className="text-gray-400 font-body text-lg max-w-xl mx-auto">
            {t("about.howItWorksDesc", "Četri vienkārši soļi līdz tavam unikālajam produktam")}
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4">
        <HowItWorksFrame />
      </div>

      {/* Install app CTA — sits at the end of the steps */}
      <div className="container mx-auto px-4 mt-14 md:mt-16 flex justify-center">
        <AnimatePresence mode="wait">
          {installing ? (
            <motion.div
              key="installing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-body font-medium text-white/90 border border-white/25 bg-white/[0.06] overflow-hidden"
            >
              {/* Sweeping progress shimmer */}
              <motion.span
                aria-hidden
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              />
              <Loader2 className="w-4 h-4 animate-spin relative z-10" />
              <span className="relative z-10">{t("install.installing", "Instalē...")}</span>
            </motion.div>
          ) : (isStandalone || justInstalled) ? (
            <motion.div
              key="installed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body"
              style={{
                background: "hsl(150 30% 18% / 0.5)",
                border: "1px solid hsl(150 35% 35%)",
                color: "hsl(150 35% 75%)",
              }}
            >
              <motion.span
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 15 }}
                className="inline-flex"
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
              </motion.span>
              {t("install.alreadyInstalled", "Lietotne instalēta")}
            </motion.div>
          ) : (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              {canInstall ? (
                <button
                  onClick={handleNativeInstall}
                  className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-body font-medium text-white/90 border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300"
                >
                  <Smartphone className="w-4 h-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]" />
                  <span>{t("install.simpleCta", "Instalēt lietotni")}</span>
                </button>
              ) : (
                <a
                  href="/install"
                  onClick={handleManualInstall}
                  className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-body font-medium text-white/90 border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300"
                >
                  <Smartphone className="w-4 h-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]" />
                  <span>{t("install.simpleCta", "Instalēt lietotni")}</span>
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
