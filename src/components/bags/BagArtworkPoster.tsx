import { useLayoutEffect, useRef } from "react";
import type { BagTemplate } from "./bagTemplateManifest";
import type { BagArtwork } from "./bagArtworkRegistry";

/** Separate painting and live type. Preview paper is CSS only, never an exported print layer. */
export function BagArtworkPoster({ composition, artwork, onError }: { composition: BagTemplate; artwork: BagArtwork; onError: () => void }) {
  const text = composition.layers[1];
  const caption = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = caption.current;
    if (!element) return;
    const fit = () => {
      const parentWidth = element.parentElement?.clientWidth ?? 240;
      let size = parentWidth * (composition.placement === "split-caption" ? .066 : .085);
      element.style.fontSize = `${size}px`;
      while ((element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) && size > 8) {
        size -= .5;
        element.style.fontSize = `${size}px`;
      }
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    let active = true;
    document.fonts.ready.then(() => { if (active) fit(); });
    fit();
    return () => { active = false; observer.disconnect(); };
  }, [text.text, composition.placement]);
  return <div className={`bag-poster bag-artwork-poster art-${composition.placement} art-palette-${composition.palette}`} aria-hidden="true">
    <div className="bag-artwork-painting"><img src={artwork.src} width={artwork.nativeWidth} height={artwork.nativeHeight} alt="" loading="lazy" decoding="async" onError={onError} /></div>
    <div ref={caption} className="bag-artwork-caption">{text.text}</div>
  </div>;
}