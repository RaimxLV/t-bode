import { useEffect, useRef, useState } from "react";
import type Lenis from "lenis";

const SRC = "/how-it-works-animation.html";

/** Same-origin iframe hosting the exact approved animation; height follows the document's reported content size. */
export function HowItWorksFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data as { type?: string; height?: number; dx?: number; dy?: number };
      if (data?.type === "tbode-how-wheel") {
        // Forwarded page scroll from the animation document (it has no own scrolling).
        const clamp = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-2000, Math.min(2000, v)) : 0);
        const dx = clamp(data.dx), dy = clamp(data.dy);
        const lenis = (window as Window & { __lenis?: Lenis }).__lenis;
        if (lenis) lenis.scrollTo(lenis.targetScroll + dy);
        else window.scrollBy({ left: dx, top: dy, behavior: "instant" });
        return;
      }
      if (data?.type !== "tbode-how-height" || typeof data.height !== "number") return;
      if (data.height > 0 && data.height < 5000) setHeight(data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1060px]" style={height ? undefined : { aspectRatio: "800 / 640" }}>
      <iframe
        ref={frame}
        src={SRC}
        title="Kā tas strādā — animācija četros soļos"
        loading="lazy"
        scrolling="no"
        className="block w-full border-0"
        style={{ height: height ? `${height}px` : "100%" }}
      />
    </div>
  );
}
