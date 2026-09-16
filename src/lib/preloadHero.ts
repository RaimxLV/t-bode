import heroBackground from "@/assets/hero-parallax-background.webp";
import heroBackgroundWide from "@/assets/hero-parallax-background-wide.webp";
import heroMidgroundMobile from "@/assets/hero-parallax-midground-jumper-mobile-wide-opt.webp";
import heroMidgroundDesktop from "@/assets/hero-koks-lecejs-desktop.webp";
import heroForeground from "@/assets/hero-parallax-foreground-complete.webp";

/**
 * Starts fetching the hero layers as early as possible (at app entry, before
 * React mounts) so the header can appear in one piece instead of waterfalling
 * sky -> light -> people once the section renders.
 */
export const preloadHeroLayers = () => {
  if (typeof document === "undefined") return;
  const isDesktop =
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  const sources = isDesktop
    ? [heroBackgroundWide, heroMidgroundDesktop, heroForeground]
    : [heroBackground, heroMidgroundMobile, heroForeground];

  for (const href of sources) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    (link as any).fetchPriority = "high";
    document.head.appendChild(link);
    // Warm the memory cache too, so <img> paints without another decode wait.
    const img = new Image();
    (img as any).fetchPriority = "high";
    img.decoding = "async";
    img.src = href;
  }
};
