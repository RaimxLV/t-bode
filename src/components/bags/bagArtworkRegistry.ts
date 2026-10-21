export type BagArtworkId = "christmas-cat" | "christmas-gifts" | "christmas-gingerbread" | "christmas-cocoa" | "cat" | "everyday" | "coffee" | "nature" | "ideas";
export type BagArtwork = {
  id: BagArtworkId;
  src: string;
  nativeWidth: number;
  nativeHeight: number;
  hasAlpha: true;
  nativeResolutionVerified: true;
};

/** Author-supplied, inspected assets only. Empty until the artwork attachment commit. */
export const bagArtworkRegistry: Partial<Record<BagArtworkId, BagArtwork>> = {};

/** Native pixels only: never infer resolution from an upscaled preview or mockup. */
export function artworkMaxPhysicalSize(artwork: BagArtwork, dpi: number = 300) {
  if (!Number.isFinite(dpi) || dpi <= 0 || !Number.isFinite(artwork.nativeWidth) ||
    !Number.isFinite(artwork.nativeHeight) || artwork.nativeWidth <= 0 || artwork.nativeHeight <= 0) return null;
  return { widthMm: artwork.nativeWidth / dpi * 25.4, heightMm: artwork.nativeHeight / dpi * 25.4, dpi };
}