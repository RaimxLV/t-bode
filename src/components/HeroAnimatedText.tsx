import { motion, useInView } from "framer-motion";
import { useRef, forwardRef } from "react";
import { useTranslation } from "react-i18next";

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

export const HeroAnimatedText = () => {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const line1 = t("hero.heroAnim.line1");
  const line2 = t("hero.heroAnim.line2");

  const words = line1.split(" ");
  const line2Delay = words.length * 0.12 + 0.5;

  if (!isInView) {
    return <div ref={ref} className="min-h-[180px] md:min-h-[220px]" />;
  }

  return (
    <div ref={ref} className="mt-4 flex flex-col items-center gap-3 md:gap-5 px-4 pointer-events-none">
      {/* key={i18n.language} resets animations when user switches language */}
      <p key={`l1-${i18n.language}`} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-white text-center leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        {words.map((w, i) => (
          <WordPow key={`${i18n.language}-${i}`} word={w} delay={i * 0.12} />
        ))}
      </p>

      <motion.p
        key={`l2-${i18n.language}`}
        className="text-sm sm:text-base md:text-lg lg:text-xl font-body text-white/85 max-w-xl text-center leading-relaxed whitespace-pre-line drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: line2Delay, duration: 0.7, ease: "easeOut" }}
      >
        {line2}
      </motion.p>
    </div>
  );
};
