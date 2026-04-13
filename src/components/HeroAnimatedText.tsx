import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const lines = [
  {
    text: "Esi unikāls.",
    className: "text-4xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-white",
  },
  {
    text: "Radi savu dizainu pats.",
    className: "text-3xl md:text-5xl lg:text-6xl font-display font-bold italic text-gradient-brand",
  },
  {
    text: "Tavs apģērbs ir tavs vēstījums.",
    className: "text-2xl md:text-4xl lg:text-5xl font-body font-semibold text-white/90",
  },
  {
    text: "Ar mūsu personalizācijas rīku tu vari izveidot ko vairāk par vienkāršu apģērbu —",
    className: "text-lg md:text-2xl lg:text-3xl font-body font-light text-white/70 max-w-2xl mx-auto",
  },
  {
    text: "tu radi savu stila ikonu.",
    className: "text-3xl md:text-5xl lg:text-6xl font-display font-extrabold text-gradient-brand uppercase tracking-widest",
  },
  {
    text: "T-Bode: Tavi dizaini – tavs stāsts.",
    className: "text-2xl md:text-4xl lg:text-5xl font-display font-bold text-white tracking-wide",
  },
];

const variants = {
  enter: (i: number) => ({
    opacity: 0,
    y: i % 2 === 0 ? 60 : -60,
    scale: 0.8,
    rotateX: i % 2 === 0 ? 15 : -15,
    filter: "blur(12px)",
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    filter: "blur(0px)",
  },
  exit: (i: number) => ({
    opacity: 0,
    y: i % 2 === 0 ? -60 : 60,
    scale: 0.8,
    rotateX: i % 2 === 0 ? -15 : 15,
    filter: "blur(12px)",
  }),
};

export const HeroAnimatedText = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % lines.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const line = lines[current];

  return (
    <div className="relative h-[120px] md:h-[160px] lg:h-[180px] flex items-center justify-center overflow-hidden" style={{ perspective: "800px" }}>
      <AnimatePresence mode="wait" custom={current}>
        <motion.p
          key={current}
          custom={current}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`absolute text-center px-4 leading-tight ${line.className}`}
        >
          {line.text}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-0 flex gap-2">
        {lines.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "bg-white w-6"
                : "bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Line ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
