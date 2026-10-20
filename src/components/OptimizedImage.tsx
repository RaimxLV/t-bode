import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { buildSrcSet, getOptimizedSrc, isSupabaseImage, DEFAULT_WIDTHS } from "@/lib/imageOptimization";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** When true, image is treated as above-the-fold and loaded eagerly */
  eager?: boolean;
  /** Show a subtle pulse skeleton while loading */
  showSkeleton?: boolean;
  wrapperClassName?: string;
  /** Target rendered width in px — used for default `src` size. Default 800. */
  width?: number;
  /** Custom `sizes` attribute. Defaults to "100vw". */
  sizes?: string;
  /** Override responsive widths used in srcset. */
  widths?: readonly number[];
  /** JPEG/WebP quality, 1-100. Default 75. */
  quality?: number;
}

/**
 * Lazy-loading image with async decoding, fade-in and automatic WebP +
 * `srcset` for Supabase Storage URLs. External URLs are used as-is.
 */
export const OptimizedImage = ({
  src,
  alt,
  eager = false,
  showSkeleton = true,
  className,
  wrapperClassName,
  width = 800,
  sizes = "100vw",
  widths = DEFAULT_WIDTHS,
  quality = 75,
  onLoad,
  onError,
  ...rest
}: OptimizedImageProps) => {
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failure, setFailure] = useState<{ src: string; stage: number }>();
  const stage = failure?.src === src ? failure.stage : 0;
  const loaded = loadedSrc === src || stage >= 2;
  const optimized = isSupabaseImage(src) ? getOptimizedSrc(src, width, quality) : src;
  const srcSet = buildSrcSet(src, widths, quality) || undefined;
  return (
    <div className={cn("relative", wrapperClassName)}>
      {showSkeleton && !loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden />
      )}
      <img
        src={stage >= 2 ? "/image-unavailable.svg" : stage === 1 ? src : optimized}
        srcSet={stage === 0 ? srcSet : undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onLoad={(event) => { setLoadedSrc(src); onLoad?.(event); }}
        onError={(event) => {
          if (stage < 2) setFailure({ src, stage: stage + 1 });
          onError?.(event);
        }}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...rest}
      />
    </div>
  );
};
