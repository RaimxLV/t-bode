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
import { useEffect, useRef, useState } from "react";
import heroBackground from "@/assets/hero-parallax-background.webp";
import heroBackgroundWide from "@/assets/hero-parallax-background-wide.webp";
import heroMidgroundMobile from "@/assets/hero-parallax-midground-jumper-mobile-wide-opt.webp";
import heroMidgroundDesktop from "@/assets/hero-koks-lecejs-desktop.webp";
import heroForeground from "@/assets/hero-parallax-foreground-complete.webp";
import { HeroAnimatedText } from "./HeroAnimatedText";
import { useDeviceTilt } from "@/hooks/useDeviceTilt";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const lastPointerMoveRef = useRef(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Only fetch the layer set that the current breakpoint actually shows, so
  // phones never download the (much larger) desktop plates and vice versa.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // Preload + decode every layer of the active breakpoint, then reveal the
  // whole hero at once instead of layer-by-layer pop-in.
  useEffect(() => {
    let cancelled = false;
    const sources = isDesktop
      ? [heroBackgroundWide, heroMidgroundDesktop, heroForeground]
      : [heroBackground, heroMidgroundMobile, heroForeground];
    const load = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        (img as any).fetchPriority = "high";
        img.decoding = "async";
        img.src = src;
        const done = () => resolve();
        if (img.decode) img.decode().then(done).catch(done);
        else {
          img.onload = done;
          img.onerror = done;
        }
      });
    setImageLoaded(false);
    Promise.all(sources.map(load)).then(() => {
      if (!cancelled) setImageLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 55, damping: 22 });
  const smoothY = useSpring(pointerY, { stiffness: 55, damping: 22 });

  // Gyroscope-driven parallax on phones/tablets
  useDeviceTilt(pointerX, pointerY, {
    amplitudeX: 13.26,
    amplitudeY: 8.16,
    enabled: !reduceMotion,
  });

  // Keep a subtle sense of depth on desktop while the pointer is idle.
  useEffect(() => {
    if (reduceMotion || typeof window === "undefined" || window.innerWidth < 1024) return;

    let frame = 0;
    const startedAt = performance.now();
    const drift = (now: number) => {
      if (now - lastPointerMoveRef.current > 1200) {
        const elapsed = (now - startedAt) / 1000;
        pointerX.set(Math.sin(elapsed * 0.24) * 8);
        pointerY.set(Math.sin(elapsed * 0.17 + 0.8) * 5);
      }
      frame = requestAnimationFrame(drift);
    };

    frame = requestAnimationFrame(drift);
    return () => cancelAnimationFrame(frame);
  }, [pointerX, pointerY, reduceMotion]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", reduceMotion ? "0%" : "8%"]);
  const midgroundY = useTransform(scrollYProgress, [0, 1], ["3%", reduceMotion ? "3%" : "21%"]);
  const backgroundX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 0.2);
  const midgroundX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 0.6);
  const foregroundX = useTransform(smoothX, (value) => reduceMotion ? 0 : value * 1.45);
  const backgroundPointerY = useTransform(smoothY, (value) => reduceMotion ? 0 : value * 0.15);
  const midgroundPointerY = useTransform(smoothY, (value) => reduceMotion ? 0 : value * 0.5);
  const foregroundPointerY = useTransform(smoothY, (value) => reduceMotion ? 0 : value * 0.8);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    lastPointerMoveRef.current = performance.now();
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
        style={{ y: backgroundY, willChange: "transform" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {!isDesktop && (
          <motion.img
            src={heroBackground}
            alt="Latvijas piekraste ar klintīm"
            width={1600}
            height={1600}
            className="absolute inset-0 size-full object-cover object-center lg:hidden"
            style={{ x: backgroundX, translateY: backgroundPointerY, scale: 1.12, willChange: "transform", backfaceVisibility: "hidden" }}
            
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            loading="eager"
          />
        )}
        {isDesktop && (
          <motion.img
            src={heroBackgroundWide}
            alt=""
            width={2304}
            height={1856}
            className="hidden lg:block lg:absolute lg:inset-0 lg:size-full lg:object-cover lg:object-center"
            style={{ x: backgroundX, translateY: backgroundPointerY, scale: 1.24, willChange: "transform", backfaceVisibility: "hidden" }}
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            loading="eager"
          />
        )}
      </motion.div>

      <motion.div aria-hidden className="absolute inset-0 z-[1]" style={{ y: midgroundY, willChange: "transform", opacity: imageLoaded ? 1 : 0, transition: "opacity 0.6s ease-out" }}>
        <div className="absolute bottom-0 left-0 h-full w-full origin-bottom translate-y-0 scale-100">
          {!isDesktop && (
            <motion.img src={heroMidgroundMobile} alt="" width={2560} height={1600} className="absolute bottom-[-10%] left-[-36.7%] h-auto w-[173.4%] max-w-none origin-bottom object-contain lg:hidden" style={{ x: midgroundX, translateY: midgroundPointerY, willChange: "transform", backfaceVisibility: "hidden" }} decoding="async" loading="eager" {...({ fetchpriority: "high" } as any)} />
          )}
          {isDesktop && (
            <motion.img src={heroMidgroundDesktop} alt="" width={1920} height={1080} className="hidden lg:block lg:absolute lg:bottom-[-2%] lg:right-[-3%] lg:h-[92%] lg:w-auto lg:max-w-none lg:object-contain lg:object-bottom" style={{ x: midgroundX, translateY: midgroundPointerY, willChange: "transform", backfaceVisibility: "hidden" }} decoding="async" loading="eager" {...({ fetchpriority: "high" } as any)} />
          )}
        </div>
      </motion.div>
      {!reduceMotion && imageLoaded && (
        <div aria-hidden className="hero-leaves hero-leaves--distant absolute inset-0 z-[2] pointer-events-none">
          <i className="hero-leaf hero-leaf--1" /><i className="hero-leaf hero-leaf--2" /><i className="hero-leaf hero-leaf--3" />
        </div>
      )}
      {!reduceMotion && imageLoaded && (
        <div aria-hidden className="hero-ambient absolute inset-0 z-[3] pointer-events-none">
          <span className="hero-ambient__glow hero-ambient__glow--warm" />
          <span className="hero-ambient__glow hero-ambient__glow--cool" />
          <span className="hero-ambient__sun-rays" />
          <span className="hero-ambient__shimmer" />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 z-[4]" style={{ opacity: imageLoaded ? 1 : 0, transition: "opacity 0.6s ease-out" }}>
        <div className="absolute bottom-0 left-0 w-full aspect-square origin-bottom translate-y-[50%] scale-[1.18] lg:inset-0 lg:aspect-auto lg:translate-y-[46%] lg:scale-[1.18]">
          <motion.img src={heroForeground} alt="" width={1600} height={1600} className="absolute inset-0 size-full object-contain object-bottom" style={{ x: foregroundX, translateY: foregroundPointerY, willChange: "transform", backfaceVisibility: "hidden" }} decoding="async" loading="eager" {...({ fetchpriority: "high" } as any)} />
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

      <div className="relative z-10 flex min-h-[760px] w-full items-start justify-center px-4 pb-10 pt-28 pointer-events-none sm:min-h-[900px] sm:pt-32 lg:container lg:mx-auto lg:min-h-[min(980px,100svh)] lg:items-center lg:justify-start lg:pb-16 lg:pt-28">
        <div className="w-full max-w-3xl mx-auto text-center pointer-events-auto lg:mx-0 lg:w-auto lg:max-w-[620px] lg:text-left">
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
            className="mx-auto mt-5 flex w-full max-w-xl flex-col items-stretch gap-3 sm:mt-8 sm:gap-4 lg:mx-0 lg:items-start"
          >
            <button
              type="button"
              onClick={() => navigate("/design")}
              className="group relative isolate w-full overflow-hidden rounded-lg px-4 sm:px-10 py-3 sm:py-6 text-base sm:text-xl md:text-2xl font-bold font-body text-primary-foreground shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] animate-personalize-pulse"
              style={{ background: "var(--gradient-brand)" }}
              aria-label={t("hero.ctaDesign")}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -inset-x-1 z-0 block animate-shimmer-slide"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.45) 50%, transparent 70%)",
                }}
              />
              <Sparkles aria-hidden className="absolute left-3 top-2 z-10 w-4 h-4 text-white/80 animate-sparkle-spin sm:left-4 sm:top-3" />
              <Sparkles aria-hidden className="absolute right-4 bottom-2 z-10 w-4 h-4 text-white/70 animate-sparkle-spin sm:right-5 sm:bottom-3" style={{ animationDelay: "0.6s" }} />
              <span className="relative z-20 flex items-center justify-center gap-3 whitespace-nowrap" style={{ transform: "translateZ(0)" }}>
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
