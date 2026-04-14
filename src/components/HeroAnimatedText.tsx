import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, forwardRef } from "react";

const WordPow = forwardRef<HTMLSpanElement, { word: string; delay: number }>(({ word, delay }, ref) => (
  <motion.span
    ref={ref}
    className="inline-block mx-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
    initial={{ opacity: 0, scale: 0, rotate: -8 }}
    animate={{ opacity: 1, scale: [0, 1.25, 0.95, 1.05, 1], rotate: [-8, 4, -2, 0] }}
    transition={{ delay, duration: 0.6, ease: "easeOut" }}
  >
    {word}
  </motion.span>
));
WordPow.displayName = "WordPow";

const TypewriterGlow = forwardRef<HTMLSpanElement, { text: string; delay: number; glowPhrase: string }>(({ text, delay, glowPhrase }, ref) => {
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
});
TypewriterGlow.displayName = "TypewriterGlow";

const LINE1 = "Esi unikāls. Radi pats!";
const LINE2 = "Krekls, hūdijs vai cepure – uztaisi savu stiliņu tūlīt. Tavs apģērbs ir tavs vēstījums pasaulei.";
const LINE3 = "T-Bode: Tavs dizains – tavs stāsts.";
const GLOW_PHRASE = "tavs stāsts.";

export const HeroAnimatedText = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const words = LINE1.split(" ");
  const line2Delay = words.length * 0.12 + 0.5;
  const line3Delay = line2Delay + 0.8;

  if (!isInView) {
    return <div ref={ref} className="min-h-[180px] md:min-h-[220px]" />;
  }

  return (
    <div ref={ref} className="mt-4 flex flex-col items-center gap-3 md:gap-5 px-4 pointer-events-none">
      <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-white text-center leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        {words.map((w, i) => (
          <WordPow key={i} word={w} delay={i * 0.12} />
        ))}
      </p>

      <motion.p
        className="text-sm sm:text-base md:text-lg lg:text-xl font-body text-white/85 max-w-xl text-center leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: line2Delay, duration: 0.7, ease: "easeOut" }}
      >
        {LINE2}
      </motion.p>

      <motion.p
        className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white text-center tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: line3Delay, duration: 0.3 }}
      >
        <TypewriterGlow text={LINE3} delay={line3Delay} glowPhrase={GLOW_PHRASE} />
      </motion.p>
    </div>
  );
};
