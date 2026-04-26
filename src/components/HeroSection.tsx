import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import heroJpg from "@/assets/hero-1280.jpg";
import heroJpgLarge from "@/assets/hero-1920.jpg";
import heroJpgSmall from "@/assets/hero-480.jpg";
import heroWebp1920 from "@/assets/hero-1920.webp";
import heroWebp1280 from "@/assets/hero-1280.webp";
import heroWebp768 from "@/assets/hero-768.webp";
import heroWebp480 from "@/assets/hero-480.webp";
import grainWebp from "@/assets/hero-grain-tile.webp";
import grainJpg from "@/assets/hero-grain-tile.jpg";
import { HeroAnimatedText } from "./HeroAnimatedText";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const webpSrcSet = `${heroWebp480} 480w, ${heroWebp768} 768w, ${heroWebp1280} 1280w, ${heroWebp1920} 1920w`;
  const jpgSrcSet = `${heroJpgSmall} 480w, ${heroJpg} 1280w, ${heroJpgLarge} 1920w`;
  const sizesAttr = "(max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1280px) 1280px, 1920px";

  return (
    <section ref={sectionRef} className="relative min-h-[120vh] overflow-hidden" style={{ position: 'relative' }}>
      {/* Preloaded hero image with fade-in (WebP with JPG fallback) */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ y: imgY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <picture>
          <source type="image/webp" srcSet={webpSrcSet} sizes={sizesAttr} />
          <img
            src={heroJpg}
            srcSet={jpgSrcSet}
            sizes={sizesAttr}
            alt="T-Bode hero"
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full object-cover object-[center_70%] md:object-[center_60%]"
            onLoad={() => setImageLoaded(true)}
            fetchPriority="high"
            decoding="async"
            loading="eager"
          />
        </picture>
      </motion.div>
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-overlay)" }}
      />
      {/* Tileable film-grain overlay (WebP with JPG fallback via image-set) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: `image-set(url(${grainWebp}) type("image/webp"), url(${grainJpg}) type("image/jpeg"))`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative z-10 flex items-center justify-center h-full container mx-auto px-4 pt-32 md:pt-40">
        <div className="max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 40 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-4xl lg:text-5xl leading-none tracking-tight text-white"
          >
            {t("hero.line1")}
            <br />
            {t("hero.line2")}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 40 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-5xl lg:text-8xl leading-none mt-2 text-gradient-brand font-extrabold md:text-8xl border-none text-destructive bg-transparent whitespace-pre-line text-center"
          >
            {t("hero.line3")}
          </motion.h2>
          {imageLoaded && <HeroAnimatedText />}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 30 }}
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
