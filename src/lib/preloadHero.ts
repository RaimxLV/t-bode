import heroBackground from "@/assets/hero-parallax-background.webp";
import heroBackgroundWide from "@/assets/hero-parallax-background-wide.webp";
import heroMidgroundDesktop from "@/assets/hero-koks-lecejs-desktop.webp";
import heroForeground from "@/assets/hero-parallax-foreground-complete.webp";
import heroPlaceholderMobile from "@/assets/hero-placeholder-mobile.webp";
import heroPlaceholderDesktop from "@/assets/hero-placeholder-desktop.webp";

const layerPromises = new Map<string, Promise<void>>();
const readyBreakpoints = new Set<"mobile" | "desktop">();

const preloadImage = (href: string) => {
  const cached = layerPromises.get(href);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    (img as any).fetchPriority = "high";
    img.decoding = "async";
    const finish = () => {
      if (typeof img.decode === "function") {
        img.decode().catch(() => undefined).then(() => resolve());
      } else {
        resolve();
      }
    };
    img.onload = finish;
    img.onerror = () => resolve();
    img.src = href;
    if (img.complete && img.naturalWidth > 0) finish();
  });

  layerPromises.set(href, promise);
  return promise;
};

/**
 * Starts fetching the hero layers as early as possible (at app entry, before
 * React mounts) so the header can appear in one piece instead of waterfalling
 * sky -> light -> people once the section renders.
 */
export const preloadHeroLayers = (desktop?: boolean) => {
  if (typeof document === "undefined") return Promise.resolve();
  const isDesktop = desktop ??
    (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  const sources = isDesktop
    ? [heroPlaceholderDesktop, heroBackgroundWide, heroMidgroundDesktop, heroForeground]
    : [heroPlaceholderMobile, heroBackground, heroMidgroundDesktop, heroForeground];

  for (const href of sources) {
    if (!document.head.querySelector(`link[data-hero-preload="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      link.dataset.heroPreload = href;
      (link as any).fetchPriority = "high";
      document.head.appendChild(link);
    }
  }

  return Promise.all(sources.map(preloadImage)).then(() => {
    readyBreakpoints.add(isDesktop ? "desktop" : "mobile");
  });
};

export const areHeroLayersReady = (desktop: boolean) =>
  readyBreakpoints.has(desktop ? "desktop" : "mobile");
