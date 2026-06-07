// Download a design as a print-ready PNG with 460 DPI metadata.
//
// IMPORTANT: We fetch the *original* PNG bytes from fal/Supabase storage and
// only inject a pHYs (DPI) chunk. We deliberately do NOT:
//   - re-encode via canvas (would strip alpha when the source has transparency
//     and lose color fidelity by going through 8-bit sRGB conversion),
//   - run a client-side bicubic upscale (visibly blurry on print),
//   - call any AI upscaler (clarity-upscaler returns JPG without alpha and
//     re-introduces a background, which is unusable for DTF print).
// The source image is already generated at 2048px on the long edge with a
// transparent background, which is print-ready at ~A4 @ 300 DPI.

const DPI = 460;

function sniffImageType(buf: ArrayBuffer, headerContentType: string | null): { isPng: boolean; extension: string; mimeType: string } {
  const bytes = new Uint8Array(buf);
  const asciiHead = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512))).trimStart().toLowerCase();
  if (asciiHead.startsWith("<svg") || (asciiHead.startsWith("<?xml") && asciiHead.includes("<svg"))) {
    return { isPng: false, extension: ".svg", mimeType: "image/svg+xml" };
  }
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (isPng) return { isPng: true, extension: ".png", mimeType: "image/png" };
  const isJpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpg) return { isPng: false, extension: ".jpg", mimeType: "image/jpeg" };
  const header = (headerContentType || "application/octet-stream").toLowerCase();
  if (header.includes("svg")) return { isPng: false, extension: ".svg", mimeType: "image/svg+xml" };
  if (header.includes("jpeg") || header.includes("jpg")) return { isPng: false, extension: ".jpg", mimeType: "image/jpeg" };
  return { isPng: false, extension: ".png", mimeType: header || "image/png" };
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
  /** @deprecated kept for API compatibility — ignored. Upscaling produced
   *  JPG-without-alpha output unusable for print and is no longer performed. */
  upscaledUrl?: string;
}): Promise<void> {
  // Fetch original PNG bytes — preserves alpha, exact pixels, full bit depth.
  const res = await fetch(opts.imageUrl, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Neizdevās ielādēt dizainu (${res.status})`);
  const buf = await res.arrayBuffer();

  // Validate it's a PNG (89 50 4E 47). If the source is JPG (e.g. an older
  // pre-transparency design), we still pass it through — the user gets the
  // original quality with no re-encoding, but DPI injection is skipped.
  const detected = sniffImageType(buf, res.headers.get("content-type"));
  const dpiBlob: Blob = detected.isPng
    ? injectDpi(buf, DPI)
    : new Blob([buf], { type: detected.mimeType });

  const url = URL.createObjectURL(dpiBlob);
  const a = document.createElement("a");
  a.href = url;
  const ext = detected.extension;
  a.download = opts.fileName.endsWith(ext) ? opts.fileName : opts.fileName.replace(/\.(png|jpg|jpeg)$/i, "") + ext;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}