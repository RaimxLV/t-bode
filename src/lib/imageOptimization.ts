/**
 * Image optimization utilities.
 *
 * Supabase Storage supports on-the-fly image transformation via URL params:
 *   /storage/v1/object/public/<bucket>/<path>?width=...&quality=...&format=webp
 *
 * We rewrite Supabase public URLs to the `render/image/public` endpoint which
 * performs the transformation. External URLs (e.g. galleries on 3rd-party
 * hosts) are returned unchanged — browsers still lazy-load them.
 */

const SUPABASE_PUBLIC_RE = /\/storage\/v1\/object\/public\//;
const SUPABASE_RENDER_RE = /\/storage\/v1\/render\/image\/public\//;

export type ImgFormat = "webp" | "origin";

export interface TransformOpts {
  width?: number;
  quality?: number;
  format?: ImgFormat;
}

/** Is this URL hosted on Supabase Storage (and therefore transformable)? */
export const isSupabaseImage = (url: string): boolean => {
  if (!url) return false;
  return SUPABASE_PUBLIC_RE.test(url) || SUPABASE_RENDER_RE.test(url);
};

/**
 * Build a transformed Supabase image URL. If the URL is not a Supabase
 * Storage URL, returns it unchanged.
 */
export const transformImage = (url: string, opts: TransformOpts = {}): string => {
  if (!url || !isSupabaseImage(url)) return url;

  // Normalize to the render/image/public endpoint so params take effect.
  let rewritten = url.replace(SUPABASE_PUBLIC_RE, "/storage/v1/render/image/public/");

  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.format && opts.format !== "origin") params.set("format", opts.format);

  // Preserve existing query (strip width/quality/format we're overriding).
  const [base, existing = ""] = rewritten.split("?");
  if (existing) {
    const prev = new URLSearchParams(existing);
    ["width", "quality", "format"].forEach((k) => prev.delete(k));
    prev.forEach((v, k) => params.set(k, v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

/** Default responsive widths used for srcset generation. */
export const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600] as const;

/** Build a `srcset` attribute value. Returns empty string for non-transformable URLs. */
export const buildSrcSet = (
  url: string,
  widths: readonly number[] = DEFAULT_WIDTHS,
  quality = 75,
): string => {
  if (!isSupabaseImage(url)) return "";
  return widths
    .map((w) => `${transformImage(url, { width: w, quality, format: "webp" })} ${w}w`)
    .join(", ");
};

/** Convenience: get a single sized WebP URL. */
export const getOptimizedSrc = (
  url: string,
  width = 800,
  quality = 75,
): string => transformImage(url, { width, quality, format: "webp" });
