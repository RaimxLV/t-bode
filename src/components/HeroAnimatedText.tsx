import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

const WordPow = ({ word, delay }: { word: string; delay: number }) => (
  <motion.span
    className="inline-block mx-1"
    initial={{ opacity: 0, scale: 0, rotate: -8 }}
    animate={{ opacity: 1, scale: [0, 1.25, 0.95, 1.05, 1], rotate: [−8, 4, -2, 0] }}
    transition={{ delay, duration: 0.6, ease: "easeOut" }}
  >
    {word}
  </motion.span>
);

const TypewriterGlow = ({ text, delay }: { text: string; delay: number }) => {
  const { t } = useTranslation();
  const glowPhrase = t("heroAnim.glowPhrase");
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started || count >= text.length) return;
    const timer = setTimeout(() => setCount((c) => c + 1), 40);
    return () => clearTimeout(timer);
  }, [started, count, text.length]);

  const visible = text.slice(0, count);
  const glowStart = text.indexOf(glowPhrase);

  if (glowStart === -1 || count <= glowStart) {
    return (
      <span>
        {visible}
        <span className="animate-pulse opacity-80">|</span>
      </span>
    );
  }

  const before = visible.slice(0, glowStart);
  const glowVisible = visible.slice(glowStart);

  return (
    <span>
      {before}
      <span className="text-gradient-brand animate-[pulse_2s_ease-in-out_infinite] drop-shadow-[0_0_18px_hsl(var(--primary)/0.7)]">
        {glowVisible}
      </span>
      {count < text.length && <span className="animate-pulse opacity-80">|</span>}
    </span>
  );
};

export const HeroAnimatedText = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const { t } = useTranslation();

  const line1 = t("heroAnim.line1");
  const line2 = t("heroAnim.line2");
  const line3 = t("heroAnim.line3");

  const words = useMemo(() => line1.split(" "), [line1]);
  const line2Delay = words.length * 0.12 + 0.5;
  const line3Delay = line2Delay + 0.8;

  if (!isInView) {
    return <div ref={ref} className="min-h-[180px] md:min-h-[220px]" />;
  }

  return (
    <div ref={ref} className="mt-4 flex flex-col items-center gap-3 md:gap-5 px-4">
      {/* Line 1 — POW wobble per word */}
      <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white text-center leading-tight">
        {words.map((w, i) => (
          <WordPow key={i} word={w} delay={i * 0.12} />
        ))}
      </p>

      {/* Line 2 — Slide down + fade */}
      <motion.p
        className="text-base sm:text-lg md:text-xl lg:text-2xl font-body text-white/80 max-w-2xl text-center leading-relaxed"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: line2Delay, duration: 0.7, ease: "easeOut" }}
      >
        {line2}
      </motion.p>

      {/* Line 3 — Typewriter + glow */}
      <motion.p
        className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white text-center tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: line3Delay, duration: 0.3 }}
      >
        <TypewriterGlow text={line3} delay={line3Delay} />
      </motion.p>
    </div>
  );
};
