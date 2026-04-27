import { motion } from "framer-motion";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/**
 * Hero install CTA — turns green when the app is already installed
 * (running in standalone mode) or surfaces install when available.
 */
export const HeroInstallBlock = () => {
  const { t } = useTranslation();
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();

  if (isStandalone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-md font-body font-semibold border-2"
        style={{
          background: "hsl(142 70% 45% / 0.15)",
          borderColor: "hsl(142 70% 55%)",
          color: "hsl(142 80% 75%)",
        }}
      >
        <CheckCircle2 className="w-5 h-5" />
        {t("install.alreadyInstalled", "Lietotne ir instalēta ✅")}
      </motion.div>
    );
  }

  // Native prompt available → trigger directly
  if (canInstall) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        onClick={() => promptInstall()}
        className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-md font-body font-semibold text-white border-2 border-white/30 backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/10"
      >
        <Download className="w-5 h-5" />
        {t("install.heroCta", "Instalēt T-Bode lietotni (Datorā vai Telefonā)")}
      </motion.button>
    );
  }

  // iOS or other → link to install instructions page
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1.2 }}
      className="mt-6"
    >
      <Link
        to="/install"
        className="inline-flex items-center gap-3 px-6 py-3 rounded-md font-body font-semibold text-white border-2 border-white/30 backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/10"
      >
        {isIOS ? <Smartphone className="w-5 h-5" /> : <Download className="w-5 h-5" />}
        {t("install.heroCta", "Instalēt T-Bode lietotni (Datorā vai Telefonā)")}
      </Link>
    </motion.div>
  );
};