// Download a design as a transparent print-ready PNG with 460 DPI metadata.
// - Removes near-white background pixels (makes them transparent)
// - Upscales (bicubic via 2-pass canvas) so the output is suitable for large prints
// - Injects a pHYs chunk into the PNG so the file reports 460 DPI

const DPI = 460;
const TARGET_LONG_EDGE = 3600; // ~20cm @ 460 DPI; safe default for shirt prints
const WHITE_THRESHOLD = 240;   // pixels >= this on R/G/B are treated as background

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Neizdevās ielādēt dizaina attēlu"));
    img.src = url;
  });
  return img;
}

function removeWhiteBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      px[i + 3] = 0;
    } else {
      // soft edge: fade alpha for very light pixels to avoid white halo
      const minC = Math.min(r, g, b);
      if (minC > 215) {
        const t = (minC - 215) / (WHITE_THRESHOLD - 215); // 0..1
        px[i + 3] = Math.round(px[i + 3] * (1 - t));
      }
    }
  }
  ctx.putImageData(data, 0, 0);
}

// Inject a pHYs chunk (DPI) immediately after the IHDR chunk
function injectDpi(buf: ArrayBuffer, dpi: number): Blob {
  const src = new Uint8Array(buf);
  // PNG signature is 8 bytes, then IHDR chunk: 4 len + 4 type + 13 data + 4 crc = 25 bytes
  const insertAt = 8 + 25;

  const ppm = Math.round(dpi * 39.3701); // pixels per metre
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  // length = 9
  chunk[0] = 0; chunk[1] = 0; chunk[2] = 0; chunk[3] = 9;
  // type "pHYs"
  chunk[4] = 0x70; chunk[5] = 0x48; chunk[6] = 0x59; chunk[7] = 0x73;
  // x ppm
  chunk[8]  = (ppm >>> 24) & 0xff;
  chunk[9]  = (ppm >>> 16) & 0xff;
  chunk[10] = (ppm >>> 8) & 0xff;
  chunk[11] = ppm & 0xff;
  // y ppm
  chunk[12] = chunk[8]; chunk[13] = chunk[9]; chunk[14] = chunk[10]; chunk[15] = chunk[11];
  // unit = 1 (metre)
  chunk[16] = 1;
  // CRC over type + data
  const crc = crc32(chunk.subarray(4, 17));
  chunk[17] = (crc >>> 24) & 0xff;
  chunk[18] = (crc >>> 16) & 0xff;
  chunk[19] = (crc >>> 8) & 0xff;
  chunk[20] = crc & 0xff;

  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(src.subarray(insertAt), insertAt + chunk.length);
  return new Blob([out], { type: "image/png" });
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export async function downloadPrintReadyPng(opts: {
  imageUrl: string;
  fileName: string;
  /** Optional pre-upscaled image URL (e.g. from fal clarity-upscaler). Used when provided. */
  upscaledUrl?: string;
}): Promise<void> {
  const img = await loadImage(opts.upscaledUrl || opts.imageUrl);

  // Compute output size: scale longest edge up to TARGET_LONG_EDGE (don't downscale below native)
  const nativeLong = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.max(1, TARGET_LONG_EDGE / nativeLong);
  const outW = Math.round(img.naturalWidth * scale);
  const outH = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas nav pieejams");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outW, outH);

  removeWhiteBackground(ctx, outW, outH);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG eksports neizdevās"))), "image/png")
  );
  const buf = await blob.arrayBuffer();
  const dpiBlob = injectDpi(buf, DPI);

  const url = URL.createObjectURL(dpiBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName.endsWith(".png") ? opts.fileName : opts.fileName + ".png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}