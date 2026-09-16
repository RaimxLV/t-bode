import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooths mouse-wheel scrolling for the whole page.
 * Touch scrolling stays native (phones already feel smooth),
 * and users with "reduced motion" enabled keep the default behaviour.
 */
export const SmoothScroll = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.6,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      syncTouch: false,
      touchMultiplier: 1,
      autoRaf: true,
    });

    (window as any).__lenis = lenis;

    return () => {
      lenis.destroy();
      if ((window as any).__lenis === lenis) delete (window as any).__lenis;
    };
  }, []);

  return null;
};
