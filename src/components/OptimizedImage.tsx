import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** When true, image is treated as above-the-fold and loaded eagerly */
  eager?: boolean;
  /** Show a subtle pulse skeleton while loading */
  showSkeleton?: boolean;
  wrapperClassName?: string;
}

/**
 * Lazy-loading image with async decoding and fade-in.
 * Browsers automatically negotiate the best format (incl. WebP/AVIF) when
 * served from CDNs that support it. For Supabase Storage, we keep the
 * existing URL — modern browsers will accept the served format.
 */
export const OptimizedImage = ({
  src,
  alt,
  eager = false,
  showSkeleton = true,
  className,
  wrapperClassName,
  ...rest
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative", wrapperClassName)}>
      {showSkeleton && !loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
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
