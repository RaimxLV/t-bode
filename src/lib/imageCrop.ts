// Image utilities for the bulk studio: trim transparent borders & export print-ready PNGs.

export async function fileToImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await urlToImage(url);
    return img;
  } finally {
    // Don't revoke immediately — caller may still use img.src. Revoke after a tick.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function urlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Crop transparent edges from a PNG. Returns a new PNG File (same name).
 * Non-PNG files are returned unchanged. Falls back to the original file on any error.
 */
export async function cropTransparentPng(file: File, alphaThreshold = 8): Promise<File> {
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  if (!isPng) return file;
  try {
    const img = await fileToImage(file);
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return file;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3];
        if (a > alphaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return file; // fully transparent
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    if (cw === w && ch === h) return file; // nothing to crop
    const out = document.createElement("canvas");
    out.width = cw; out.height = ch;
    const octx = out.getContext("2d");
    if (!octx) return file;
    octx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/png"));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".png"), { type: "image/png" });
  } catch {
    return file;
  }
}

/**
 * Run an async worker over items with limited concurrency.
 */
export async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0; let done = 0;
  const total = items.length;
  async function next() {
    while (true) {
      const idx = i++;
      if (idx >= total) return;
      try { results[idx] = await worker(items[idx], idx); }
      finally { done++; onProgress?.(done, total); }
    }
  }
  const runners = Array.from({ length: Math.min(limit, Math.max(1, total)) }, () => next());
  await Promise.all(runners);
  return results;
}

/**
 * Render a print-ready PNG canvas: a preset-sized transparent canvas (width_cm × height_cm at given DPI)
 * with the design centered and scaled so its max bounded dimension (in cm) matches `maxCm`.
 * If `bound` is "width" the design width = maxCm; if "height" the design height = maxCm.
 * Returns a PNG Blob and the final canvas pixel size.
 */
export async function renderPrintReady(opts: {
  designUrl: string;
  widthCm: number;
  heightCm: number;
  dpi: number;
  maxCm: number;
  bound: "width" | "height";
  trimDesign?: boolean; // trim transparent edges of design before placing
}): Promise<{ blob: Blob; widthPx: number; heightPx: number }> {
  const dpi = opts.dpi;
  const cmToPx = (cm: number) => Math.round((cm / 2.54) * dpi);
  const canvasW = cmToPx(opts.widthCm);
  const canvasH = cmToPx(opts.heightCm);

  let img = await urlToImage(opts.designUrl);

  // Optionally trim transparent edges of source design
  if (opts.trimDesign) {
    const trimmedBlob = await trimCanvas(img);
    if (trimmedBlob) {
      const trimmedUrl = URL.createObjectURL(trimmedBlob);
      try { img = await urlToImage(trimmedUrl); } finally { URL.revokeObjectURL(trimmedUrl); }
    }
  }

  const designAspect = img.naturalWidth / img.naturalHeight;
  let designPxW: number, designPxH: number;
  if (opts.bound === "width") {
    designPxW = cmToPx(opts.maxCm);
    designPxH = Math.round(designPxW / designAspect);
  } else {
    designPxH = cmToPx(opts.maxCm);
    designPxW = Math.round(designPxH * designAspect);
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasW; canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const dx = Math.round((canvasW - designPxW) / 2);
  const dy = Math.round((canvasH - designPxH) / 2);
  ctx.drawImage(img, dx, dy, designPxW, designPxH);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Failed to render PNG");
  return { blob, widthPx: canvasW, heightPx: canvasH };
}

/**
 * Composite a design onto a mockup using a normalized print_area rect (0..1 of mockup size).
 * The design is contained inside the rect (preserving aspect). Output is JPEG for smaller files.
 */
export async function composeMockup(opts: {
  mockupUrl: string;
  designUrl: string;
  printArea: { x: number; y: number; w: number; h: number };
  maxWidth?: number; // output max width in px (default 1200)
  quality?: number;  // jpeg quality
  baseColorHex?: string; // optional hex of the garment color — drives blend mode
}): Promise<Blob> {
  const [mock, design] = await Promise.all([urlToImage(opts.mockupUrl), urlToImage(opts.designUrl)]);
  const maxW = opts.maxWidth ?? 1200;
  const scale = mock.naturalWidth > maxW ? maxW / mock.naturalWidth : 1;
  const cw = Math.round(mock.naturalWidth * scale);
  const ch = Math.round(mock.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mock, 0, 0, cw, ch);

  const rx = opts.printArea.x * cw;
  const ry = opts.printArea.y * ch;
  const rw = opts.printArea.w * cw;
  const rh = opts.printArea.h * ch;
  const aspect = design.naturalWidth / design.naturalHeight;
  let dw = rw, dh = rw / aspect;
  if (dh > rh) { dh = rh; dw = rh * aspect; }
  const dx = rx + (rw - dw) / 2;
  const dy = ry + (rh - dh) / 2;

  // Pick blend mode based on garment lightness so the print follows the fabric:
  //   light shirt → multiply (dark areas of print darken the fabric, white = transparent feel)
  //   dark shirt  → screen   (light areas of print lighten the fabric, black = transparent feel)
  //   mid-tone    → source-over with slight opacity
  const lightness = opts.baseColorHex ? hexLightness(opts.baseColorHex) : 0.5;
  let blend: GlobalCompositeOperation = "source-over";
  let alpha = 1;
  if (lightness > 0.75) { blend = "multiply"; alpha = 0.95; }
  else if (lightness < 0.25) { blend = "screen"; alpha = 0.9; }
  else { blend = "source-over"; alpha = 0.95; }

  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = alpha;
  ctx.drawImage(design, dx, dy, dw, dh);
  ctx.restore();

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", opts.quality ?? 0.9)
  );
  if (!blob) throw new Error("Failed to render mockup");
  return blob;
}

function hexLightness(hex: string): number {
  const m = hex.replace("#", "").trim();
  if (m.length !== 6 && m.length !== 3) return 0.5;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  // perceptual luminance
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function trimCanvas(img: HTMLImageElement, alphaThreshold = 8): Promise<Blob | null> {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  if (cw === w && ch === h) return await new Promise((r) => c.toBlob(r, "image/png"));
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d")!.drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
  return await new Promise((r) => out.toBlob(r, "image/png"));
}