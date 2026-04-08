import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import heroImage from "@/assets/hero.jpg";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative h-screen overflow-hidden">
      <div
        className="absolute inset-0 parallax-bg"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundPosition: "top center",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-overlay)" }}
      />

      <div className="relative z-10 flex items-center justify-center h-full container mx-auto px-4">
        <div className="max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white uppercase"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }}
          >
            {t("hero.line1")}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-2"
          >
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-none tracking-tight uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 900,
                color: "#DC2626",
              }}
            >
              {t("hero.line3a")}
            </span>
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-none tracking-tight uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 900,
                color: "#DC2626",
              }}
            >
              {t("hero.line3b")}
            </span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-6 text-base sm:text-lg md:text-xl text-white/80 max-w-lg mx-auto font-body"
          >
            {t("hero.description")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => navigate("/design")}
              className="group inline-flex items-center justify-center gap-3 px-10 py-4 rounded-md font-body font-bold text-lg transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: "var(--gradient-brand)", color: "white" }}
            >
              {t("hero.ctaDesign")}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/collection")}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-md font-body font-semibold text-lg border-2 border-white/40 text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/60"
            >
              {t("hero.ctaCollection")}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
