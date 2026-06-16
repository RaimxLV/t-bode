import { Link } from "react-router-dom";
import { Sparkles, Wand2 } from "lucide-react";

interface HeroCtaButtonProps {
  to: string;
  label: string;
  className?: string;
  size?: "default" | "lg";
}

/**
 * Same shimmering, pulsing brand CTA used in the hero section.
 * Reused on SEO landing pages so the primary action feels identical
 * to the homepage hero button.
 */
export const HeroCtaButton = ({ to, label, className = "", size = "lg" }: HeroCtaButtonProps) => {
  const pad =
    size === "lg"
      ? "px-6 sm:px-10 py-5 sm:py-6 text-lg sm:text-xl md:text-2xl"
      : "px-5 sm:px-8 py-4 text-base sm:text-lg";
  return (
    <Link
      to={to}
      aria-label={label}
      className={`group relative inline-flex overflow-hidden rounded-lg ${pad} font-bold font-body text-primary-foreground shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] animate-personalize-pulse ${className}`}
      style={{ background: "var(--gradient-brand)" }}
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
      <Sparkles
        aria-hidden
        className="absolute right-5 bottom-3 w-4 h-4 text-white/70 animate-sparkle-spin"
        style={{ animationDelay: "0.6s" }}
      />
      <span className="relative flex items-center justify-center gap-3 whitespace-nowrap w-full">
        <Wand2 className="w-6 h-6 shrink-0 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
        <span className="tracking-wide uppercase whitespace-nowrap">{label}</span>
        <Sparkles className="w-5 h-5 shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110" />
      </span>
    </Link>
  );
};

export default HeroCtaButton;