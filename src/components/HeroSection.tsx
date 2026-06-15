import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
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
import heroJani from "@/assets/hero-jani.jpg";
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

  // Jāņi takeover hero — show the bonfire artwork until June 25 (end of day, Riga time),
  // then automatically fall back to the default hero.
  const showJani = Date.now() < Date.parse("2026-06-26T00:00:00+03:00");

  const webpSrcSet = `${heroWebp480} 480w, ${heroWebp768} 768w, ${heroWebp1280} 1280w, ${heroWebp1920} 1920w`;
  const jpgSrcSet = `${heroJpgSmall} 480w, ${heroJpg} 1280w, ${heroJpgLarge} 1920w`;
  const sizesAttr = "(max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1280px) 1280px, 1920px";

  return (
    <section ref={sectionRef} className={`relative overflow-hidden ${showJani ? 'min-h-[120vh]' : 'min-h-[120vh]'}`} style={{ position: 'relative' }}>
      {/* Preloaded hero image with fade-in (WebP with JPG fallback) */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ y: imgY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {showJani ? (
          <img
            src={heroJani}
            alt="Jāņu nakts pie ugunskura ar LATVIJA hūdijiem — T-Bode Jāņu kolekcija"
            className="absolute inset-0 w-full h-full object-cover object-[center_55%] md:object-[center_60%]"
            onLoad={() => setImageLoaded(true)}
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            loading="eager"
          />
        ) : (
        <picture>
          <source type="image/webp" srcSet={webpSrcSet} sizes={sizesAttr} />
          <img
            src={heroJpg}
            srcSet={jpgSrcSet}
            sizes={sizesAttr}
            alt="Apdrukāts T-krekls ar savu dizainu — T-Bode DTF kreklu apdruka Rīgā"
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full object-cover object-[center_70%] md:object-[center_60%]"
            onLoad={() => setImageLoaded(true)}
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            loading="eager"
          />
        </picture>
        )}
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
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tight font-display font-extrabold uppercase"
          >
            <span className="block text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
              {t("hero.sloganLine1")}
            </span>
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 40 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="block text-gradient-brand drop-shadow-[0_2px_14px_rgba(220,38,38,0.4)]"
            >
              {t("hero.sloganLine2")}
            </motion.span>
          </motion.h1>
          {imageLoaded && <HeroAnimatedText />}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 30 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-col gap-4 items-center max-w-xl mx-auto"
          >
            <button
              type="button"
              onClick={() => navigate("/design")}
              className="group relative w-full overflow-hidden rounded-lg px-4 sm:px-10 py-6 text-lg sm:text-xl md:text-2xl font-bold font-body text-primary-foreground shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] animate-personalize-pulse"
              style={{ background: "var(--gradient-brand)" }}
              aria-label={t("hero.ctaDesign")}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -inset-x-1 block animate-shimmer-slide"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.45) 50%, transparent 70%)",
                }}
              />
              <Sparkles aria-hidden className="absolute left-4 top-3 w-4 h-4 text-white/80 animate-sparkle-spin" />
              <Sparkles aria-hidden className="absolute right-5 bottom-3 w-4 h-4 text-white/70 animate-sparkle-spin" style={{ animationDelay: "0.6s" }} />
              <span className="relative flex items-center justify-center gap-3 whitespace-nowrap">
                <Wand2 className="w-6 h-6 shrink-0 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
                <span className="tracking-wide uppercase whitespace-nowrap">{t("hero.ctaDesign")}</span>
                <Sparkles className="w-5 h-5 shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110" />
              </span>
            </button>
            <button
              onClick={() => navigate("/collection")}
              className="group w-full inline-flex items-center justify-center gap-3 px-4 sm:px-10 py-6 rounded-lg font-body font-bold text-lg sm:text-xl md:text-2xl uppercase tracking-wide text-white border-2 border-white/50 bg-black/30 backdrop-blur-sm transition-all hover:scale-[1.03] hover:bg-white/10 hover:border-white/80 active:scale-[0.98] whitespace-nowrap"
            >
              {t("hero.ctaCollection")}
              <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
