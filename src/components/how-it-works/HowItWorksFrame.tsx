import { useEffect, useRef, useState } from "react";

const SRC = "/how-it-works-animation.html";

/** Same-origin iframe hosting the exact approved animation; height follows the document's reported content size. */
export function HowItWorksFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data as { type?: string; height?: number };
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
