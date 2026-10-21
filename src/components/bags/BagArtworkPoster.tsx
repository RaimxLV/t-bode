import type { BagTemplate } from "./bagTemplateManifest";
import type { BagArtwork } from "./bagArtworkRegistry";

/** Separate painting and live type. Preview paper is CSS only, never an exported print layer. */
export function BagArtworkPoster({ composition, artwork, onError }: { composition: BagTemplate; artwork: BagArtwork; onError: () => void }) {
  const text = composition.layers[1];
  return <div className={`bag-poster bag-artwork-poster art-${composition.placement} art-palette-${composition.palette}`} aria-hidden="true">
    <div className="bag-artwork-painting"><img src={artwork.src} width={artwork.nativeWidth} height={artwork.nativeHeight} alt="" loading="lazy" decoding="async" onError={onError} /></div>
    <div className="bag-artwork-caption">{text.text}</div>
  </div>;
}