import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import heroImage from "@/assets/hero.jpg";
import { HeroAnimatedText } from "./HeroAnimatedText";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: image moves slower than scroll
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section ref={sectionRef} className="relative min-h-[120vh] overflow-hidden">
      {/* Parallax image via framer-motion transform */}
      <motion.img
        src={heroImage}
        alt="T-Bode hero"
        className="absolute inset-0 w-full h-full object-cover object-[center_70%] md:object-[center_60%]"
        style={{ y: imgY }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-overlay)" }}
      />

      <div className="relative z-10 flex items-end justify-center h-full container mx-auto px-4 pb-8 md:pb-16">
        <div className="max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-4xl lg:text-5xl leading-none tracking-tight text-white"
          >
            {t("hero.line1")}
            <br />
            {t("hero.line2")}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-5xl lg:text-8xl leading-none mt-2 text-gradient-brand font-extrabold md:text-8xl border-none text-destructive bg-transparent whitespace-pre-line text-center"
          >
            {t("hero.line3")}
          </motion.h2>
          <HeroAnimatedText />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-6 flex flex-col sm:flex-row gap-4 justify-center"
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
