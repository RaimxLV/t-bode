import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import heroBackground from "@/assets/hero-parallax-background.webp";
import heroMidground from "@/assets/hero-parallax-midground.webp";
import heroJumper from "@/assets/hero-parallax-jumper.webp";
import heroForeground from "@/assets/hero-parallax-foreground-complete.webp";
import grainWebp from "@/assets/hero-grain-tile.webp";
import grainJpg from "@/assets/hero-grain-tile.jpg";
import { HeroAnimatedText } from "./HeroAnimatedText";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 55, damping: 22 });
  const smoothY = useSpring(pointerY, { stiffness: 55, damping: 22 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", reduceMotion ? "0%" : "8%"]);
  const midgroundY = useTransform(scrollYProgress, [0, 1], ["3%", reduceMotion ? "3%" : "21%"]);
  const jumperY = useTransform(scrollYProgress, [0, 1], ["0%", reduceMotion ? "0%" : "21%"]);
  const backgroundX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 0.2);
  const midgroundX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 0.55);
  const jumperX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 0.95);
  const foregroundX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 1.45);
  const backgroundPointerY = useTransform(smoothY, (value) => reduceMotion ? 0 : value * 0.15);
  const midgroundPointerY = useTransform(smoothY, (value) => reduceMotion ? 0 : value * 0.45);
  const jumperPointerY = useTransform(smoothY, (value) => reduceMotion ? 0 : value * 0.8);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 24);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 18);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[760px] sm:min-h-[900px] lg:min-h-[min(980px,100svh)] overflow-hidden bg-hero-sky"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{ y: backgroundY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.img
          src={heroBackground}
          alt="Latvijas piekraste ar klintīm"
          width={1600}
          height={1600}
          className="absolute inset-0 size-full object-cover object-center"
          style={{ x: backgroundX, translateY: backgroundPointerY, scale: 1.035 }}
          onLoad={() => setImageLoaded(true)}
          {...({ fetchpriority: "high" } as any)}
          decoding="async"
          loading="eager"
        />
      </motion.div>

      <motion.div aria-hidden className="absolute inset-0 z-[1]" style={{ y: midgroundY }}>
        <motion.img src={heroMidground} alt="" width={1600} height={1600} className="absolute bottom-0 left-0 h-auto w-full object-contain lg:inset-0 lg:size-full lg:object-cover lg:object-[center_58%]" style={{ x: midgroundX, translateY: midgroundPointerY, scale: 1.02 }} decoding="async" />
      </motion.div>
      {!reduceMotion && (
        <div aria-hidden className="hero-leaves hero-leaves--distant absolute inset-0 z-[2] pointer-events-none">
          <i className="hero-leaf hero-leaf--1" /><i className="hero-leaf hero-leaf--2" /><i className="hero-leaf hero-leaf--3" />
        </div>
      )}
      <motion.div aria-hidden className="absolute inset-0 z-[3]" style={{ y: jumperY }}>
        <div className="absolute bottom-0 left-0 w-full aspect-square translate-y-[6%] lg:inset-0 lg:aspect-auto lg:translate-y-[1%]">
          <motion.img src={heroJumper} alt="" width={1600} height={1600} className="absolute inset-0 size-full object-contain" style={{ x: jumperX, translateY: jumperPointerY, scale: 1.02 }} decoding="async" />
        </div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 z-[4]">
        <div className="absolute bottom-0 left-0 w-full aspect-square origin-bottom translate-y-[50%] scale-[1.12] lg:inset-0 lg:aspect-auto lg:translate-y-[46%] lg:scale-[1.12]">
          <motion.img src={heroForeground} alt="" width={1600} height={1600} className="absolute inset-0 size-full object-contain object-bottom" style={{ x: foregroundX }} decoding="async" />
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-0 z-[5] bg-hero-parallax-overlay"
      />
      {!reduceMotion && (
        <div aria-hidden className="hero-leaves absolute inset-0 z-[8] pointer-events-none">
          <i className="hero-leaf hero-leaf--4" /><i className="hero-leaf hero-leaf--5" /><i className="hero-leaf hero-leaf--6" />
          <i className="hero-leaf hero-leaf--7" /><i className="hero-leaf hero-leaf--8" />
        </div>
      )}
      {/* Tileable film-grain overlay (WebP with JPG fallback via image-set) */}
      <div
        aria-hidden
        className="absolute inset-0 z-[9] pointer-events-none opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: `image-set(url(${grainWebp}) type("image/webp"), url(${grainJpg}) type("image/jpeg"))`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative z-10 flex min-h-[760px] sm:min-h-[900px] lg:min-h-[min(980px,100svh)] items-start lg:items-center container mx-auto px-4 pt-28 sm:pt-32 lg:pt-28 pb-10 lg:pb-16 pointer-events-none">
        <div className="max-w-3xl text-center lg:text-left lg:max-w-[620px] pointer-events-auto">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 40 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-9xl leading-[0.95] tracking-tight font-display font-extrabold uppercase"
          >
            <span className="sr-only">T-kreklu un hūdiju apdruka Rīgā — personalizē online. </span>
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
            className="mt-5 sm:mt-8 flex flex-col gap-3 sm:gap-4 items-center lg:items-start max-w-xl mx-auto lg:mx-0"
          >
            <button
              type="button"
              onClick={() => navigate("/design")}
              className="group relative w-full overflow-hidden rounded-lg px-4 sm:px-10 py-3 sm:py-6 text-base sm:text-xl md:text-2xl font-bold font-body text-primary-foreground shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] animate-personalize-pulse"
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
              <Sparkles aria-hidden className="absolute left-3 top-2 w-4 h-4 text-white/80 animate-sparkle-spin sm:left-4 sm:top-3" />
              <Sparkles aria-hidden className="absolute right-4 bottom-2 w-4 h-4 text-white/70 animate-sparkle-spin sm:right-5 sm:bottom-3" style={{ animationDelay: "0.6s" }} />
              <span className="relative flex items-center justify-center gap-3 whitespace-nowrap">
                <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
                <span className="tracking-wide uppercase whitespace-nowrap">{t("hero.ctaDesign")}</span>
                <Sparkles className="w-5 h-5 shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110" />
              </span>
            </button>
            <button
              onClick={() => navigate("/collection")}
              className="group w-full inline-flex items-center justify-center gap-3 px-4 sm:px-10 py-3 sm:py-6 rounded-lg font-body font-bold text-base sm:text-xl md:text-2xl uppercase tracking-wide text-white border-2 border-white/50 bg-black/30 backdrop-blur-sm transition-all hover:scale-[1.03] hover:bg-white/10 hover:border-white/80 active:scale-[0.98] whitespace-nowrap"
            >
              {t("hero.ctaCollection")}
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
