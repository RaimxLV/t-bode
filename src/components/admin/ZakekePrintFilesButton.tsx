import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileArchive,
  FileImage,
  FileText,
  Loader2,
  Clock,
  Download,
  Eye,
  X,
  Check,
} from "lucide-react";

interface Item {
  id: string;
  product_name?: string;
  created_at?: string;
  zakeke_design_id?: string | null;
  zakeke_order_id?: string | null;
  zakeke_order_item_id?: string | null;
  zakeke_thumbnail_url?: string | null;
  zakeke_preview_urls?: string[] | null;
  zakeke_print_files?: any;
  zakeke_files_downloaded_at?: string | null;
  quantity?: number | null;
  size?: string | null;
  is_bulk?: boolean | null;
  selected_sizes?: Record<string, number> | null;
}

interface Props {
  item: Item;
  variant?: "block" | "inline";
  /** Order number used for friendly filenames, e.g. 78 → TB-0078 */
  orderNumber?: number | null;
  /** Client / company name used as filename prefix */
  clientName?: string | null;
}

interface NormalizedFile {
  name: string;
  url: string;
  side?: string | null;
  kind: "mockup" | "print" | "zip" | "other";
  ext: string;
}

const filesReady = (f: any): boolean => {
  if (!f) return false;
  if (Array.isArray(f)) return f.length > 0;
  if (typeof f === "object") return Object.keys(f).length > 0;
  return false;
};

const getExt = (name: string, url: string): string => {
  // Try filename first (clean — no query string)
  const nameMatch = name.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  if (nameMatch) return nameMatch[1];
  // Strip query/fragment from URL and look at the path's last segment
  try {
    const u = new URL(url);
    // Some signed URLs put the real filename in a query param
    const cd = u.searchParams.get("response-content-disposition") ?? "";
    const cdMatch = cd.toLowerCase().match(/filename[^;=\n]*=(?:"([^"]+)"|([^;]+))/);
    const cdName = cdMatch ? (cdMatch[1] || cdMatch[2] || "") : "";
    if (cdName) {
      const m = cdName.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
      if (m) return m[1];
    }
    const pathMatch = u.pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
    if (pathMatch) return pathMatch[1];
  } catch {
    const m = url.toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|#|$)/);
    if (m) return m[1];
  }
  return "";
};

const detectKind = (
  side: string | null | undefined,
  name: string,
  ext: string,
  url: string,
): NormalizedFile["kind"] => {
  const s = `${side ?? ""} ${name} ${url}`.toLowerCase();
  if (ext === "zip" || s.includes("zip")) return "zip";
  // Zakeke production files put the side in the URL (e.g. _Front_, _Back_)
  // even when the `side` field is just "PNG" — classify those as print.
  if (/front|back|left|right/.test(s)) {
    if (s.includes("mockup") || s.includes("preview") || s.includes("thumbnail")) return "mockup";
    return "print";
  }
  if (s.includes("mockup") || s.includes("preview") || s.includes("thumbnail")) return "mockup";
  if (s.includes("print") || s.includes("production")) return "print";
  // zakeke_print_files only contains production assets — mockups live in
  // zakeke_preview_urls — so default unknown images to print.
  if (["png", "jpg", "jpeg", "webp", "pdf", "ai", "eps", "svg", "tif", "tiff"].includes(ext)) return "print";
  return "other";
};

const normalize = (raw: any): NormalizedFile[] => {
  if (!raw) return [];
  const arr: any[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.values(raw)
      : [];
  return arr
    .map((f: any): NormalizedFile | null => {
      const url = f?.url ?? f?.fileUrl ?? f?.downloadUrl ?? f?.link;
      if (!url) return null;
      const name = String(f?.name ?? f?.fileName ?? url.split("/").pop() ?? "fails");
      const ext = getExt(name, url);
      return {
        name,
        url: String(url),
        side: f?.side ?? null,
        kind: detectKind(f?.side, name, ext, String(url)),
        ext,
      };
    })
    .filter((f): f is NormalizedFile => !!f);
};

const sideLabel = (f: NormalizedFile, fallbackIndex?: number): string => {
  const s = `${f.side ?? ""} ${f.name} ${f.url}`.toLowerCase();
  if (/front|priekš/.test(s)) return "Priekša";
  if (/back|aizmug/.test(s)) return "Aizmugure";
  if (/left|kreis/.test(s)) return "Kreisā";
  if (/right|\blab/.test(s)) return "Labā";
  if (f.kind === "mockup") return "Mockup";
  if (f.kind === "zip") return "ZIP arhīvs";
  if (f.side && f.side.toLowerCase() !== "png") return f.side;
  // Fallback for print files with cryptic UUID names — label by order
  if (f.kind === "print" && typeof fallbackIndex === "number") {
    if (fallbackIndex === 0) return "Priekša";
    if (fallbackIndex === 1) return "Aizmugure";
    return `Druka ${fallbackIndex + 1}`;
  }
  return f.name;
};

const slugify = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "fails";

const normalizeSizeLabel = (size: string): string => {
  const raw = size.trim();
  const compact = raw.replace(/[\s-_]+/g, "");
  const normalizedBase = /^(xs|s|m|l|xl|xxl|xxxl|xxxxl|xxxxxl|\d+xl|\d+ml)$/i.test(compact)
    ? compact
    : raw.replace(/^\d+\s*[-_ ]*[x×]\s*/i, "").replace(/[\s-_]+/g, "");
  const cleaned = normalizedBase.replace(/^([2345])xl$/i, (_, digits: string) => "X".repeat(Number(digits)) + "L");
  return slugify(cleaned).toUpperCase();
};

const sideSlug = (f: NormalizedFile, fallbackIndex?: number): string => {
  const label = sideLabel(f, fallbackIndex).toLowerCase();
  if (label.includes("priekš")) return "priekspuse";
  if (label.includes("aizmug")) return "aizmugure";
  if (label.includes("kreis")) return "kreisa";
  if (label.includes("lab")) return "laba";
  if (label.includes("mockup")) return "mockup";
  if (label.includes("zip")) return "arhivs";
  return slugify(label);
};

const buildFriendlyName = (
  f: NormalizedFile,
  ctx: {
    orderNumber?: number | null;
    clientName?: string | null;
    quantity?: number | null;
    size?: string | null;
    isBulk?: boolean | null;
    selectedSizes?: Record<string, number> | null;
  },
  fallbackIndex?: number,
): string => {
  const parts: string[] = [];
  if (ctx.orderNumber != null) {
    parts.push(`TB-${String(ctx.orderNumber).padStart(4, "0")}`);
  }
  if (ctx.clientName) parts.push(slugify(ctx.clientName));
  parts.push(sideSlug(f, fallbackIndex));
  // Append quantity info so the print worker sees how many copies to print.
  if (f.kind === "print") {
    if (ctx.isBulk && ctx.selectedSizes && Object.keys(ctx.selectedSizes).length > 0) {
      const breakdown = Object.entries(ctx.selectedSizes)
        .filter(([, n]) => Number(n) > 0)
        .map(([s, n]) => `${n}${normalizeSizeLabel(s)}`)
        .join("-");
      const total = Object.values(ctx.selectedSizes).reduce(
        (sum, n) => sum + (Number(n) || 0),
        0,
      );
      if (breakdown) parts.push(breakdown);
      if (total > 0) parts.push(`${total}gab`);
    } else if (ctx.quantity != null && ctx.quantity > 0) {
      if (ctx.size) {
        const sz = normalizeSizeLabel(ctx.size);
        parts.push(ctx.quantity > 1 ? `${ctx.quantity}${sz}` : sz);
      }
      parts.push(`${ctx.quantity}gab`);
    }
  }
  const ext = f.ext || "bin";
  return `${parts.join("_")}.${ext}`;
};

const extFromMime = (mime: string): string => {
  const m = mime.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/postscript": "eps",
    "application/illustrator": "ai",
  };
  return map[m] ?? "";
};

const swapExt = (filename: string, newExt: string): string => {
  if (!newExt) return filename;
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? `${filename.slice(0, dot)}.${newExt}` : `${filename}.${newExt}`;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    a.remove();
  }, 1500);
};

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;

const getPngChunk = (bytes: Uint8Array, type: string): Uint8Array | null => {
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const end = offset + length + 12;
    if (end > bytes.length) return null;
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (chunkType === type) return bytes.slice(offset, end);
    offset = end;
  }
  return null;
};

const concatUint8Arrays = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const injectPngPhysChunk = (pngBytes: Uint8Array, physChunk: Uint8Array | null): Uint8Array => {
  if (!physChunk || pngBytes.length < PNG_SIGNATURE.length) return pngBytes;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (pngBytes[i] !== PNG_SIGNATURE[i]) return pngBytes;
  }

  const parts: Uint8Array[] = [pngBytes.slice(0, 8)];
  let offset = 8;
  let inserted = false;

  while (offset + 8 <= pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    const end = offset + length + 12;
    if (end > pngBytes.length) return pngBytes;

    const chunkType = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7],
    );

    if (chunkType !== "pHYs") {
      parts.push(pngBytes.slice(offset, end));
      if (!inserted && chunkType === "IHDR") {
        parts.push(physChunk);
        inserted = true;
      }
    }

    offset = end;
  }

  return inserted ? concatUint8Arrays(parts) : pngBytes;
};

const loadImageElement = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Neizdevās atvērt PNG failu"));
    };
    img.src = objectUrl;
  });

const cropTransparentPaddingFromPng = async (blob: Blob): Promise<Blob> => {
  const originalBytes = new Uint8Array(await blob.arrayBuffer());
  const physChunk = getPngChunk(originalBytes, "pHYs");
  const source = typeof createImageBitmap === "function"
    ? await createImageBitmap(blob)
    : await loadImageElement(blob);

  try {
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height = "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!width || !height) return blob;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas nav pieejams");
    ctx.drawImage(source, 0, 0);

    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] === 0) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX === -1) return blob;
    if (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1) return blob;

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropWidth;
    outCanvas.height = cropHeight;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) throw new Error("Canvas nav pieejams");
    outCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
      outCanvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Neizdevās sagatavot apgriezto PNG"));
      }, "image/png");
    });

    const croppedBytes = new Uint8Array(await croppedBlob.arrayBuffer());
    const finalBytes = injectPngPhysChunk(croppedBytes, physChunk);
    return new Blob([toArrayBuffer(finalBytes)], { type: "image/png" });
  } finally {
    if ("close" in source && typeof source.close === "function") {
      source.close();
    }
  }
};

const triggerDownload = async (f: NormalizedFile, friendlyName: string, orderItemId?: string) => {
  // Hard timeout so a hanging Zakeke/edge-function stream can never lock the
  // UI in "Lādējas…". Without this, admins had to close & reopen the order
  // panel between every download to reset state.
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 60_000);
  try {
    let res: Response;
    if (orderItemId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      if (token && projectUrl) {
        const url = `${projectUrl}/functions/v1/zakeke-print-files?order_item_id=${encodeURIComponent(orderItemId)}&download_url=${encodeURIComponent(f.url)}&download_name=${encodeURIComponent(friendlyName)}`;
        res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          res = await fetch(f.url, { signal: controller.signal });
        }
      } else {
        res = await fetch(f.url, { signal: controller.signal });
      }
    } else {
      res = await fetch(f.url, { signal: controller.signal });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    // If we couldn't determine the extension up front (ended in .bin), use
    // the response's Content-Type to fix it before saving.
    let finalName = friendlyName;
    if (/\.bin$/i.test(finalName)) {
      const fromMime = extFromMime(blob.type || res.headers.get("content-type") || "");
      if (fromMime) finalName = swapExt(finalName, fromMime);
    }
    let finalBlob = blob;
    const ext = (f.ext || extFromMime(blob.type || res.headers.get("content-type") || "")).toLowerCase();
    if (f.kind === "print" && (ext === "png" || blob.type === "image/png")) {
      try {
        finalBlob = await cropTransparentPaddingFromPng(blob);
        finalName = swapExt(finalName, "png");
      } catch (error) {
        console.error("trim transparent padding failed", error);
        toast.error("Neizdevās noņemt caurspīdīgās malas, lejupielādēju oriģinālo failu.");
      }
    }
    downloadBlob(finalBlob, finalName);
  } catch (err) {
    console.error("triggerDownload failed", err);
    if ((err as any)?.name === "AbortError") {
      toast.error("Lejupielāde aizņēma pārāk ilgi. Mēģini vēlreiz.");
    }
    // Fallback: open in new tab so admin can save manually
    window.open(f.url, "_blank", "noopener");
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const ZakekePrintFilesButton = ({ item, variant = "inline", orderNumber, clientName }: Props) => {
  const [files, setFiles] = useState<any>(item.zakeke_print_files);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<string | null>(
    item.zakeke_files_downloaded_at ?? null,
  );
  const [elapsed, setElapsed] = useState<number>(() => {
    if (!item.created_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(item.created_at).getTime()) / 1000));
  });
  const syncTriggered = useRef(false);

  const ready = filesReady(files);
  const hasZakeke = !!(item.zakeke_design_id || item.zakeke_order_id);

  useEffect(() => {
    setFiles(item.zakeke_print_files);
  }, [item.zakeke_print_files]);

  useEffect(() => {
    setDownloadedAt(item.zakeke_files_downloaded_at ?? null);
  }, [item.zakeke_files_downloaded_at]);

  const markDownloaded = async () => {
    const nowIso = new Date().toISOString();
    setDownloadedAt(nowIso);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("order_items")
      .update({
        zakeke_files_downloaded_at: nowIso,
        zakeke_files_downloaded_by: userData?.user?.id ?? null,
      })
      .eq("id", item.id);
    if (error) {
      // revert local state on failure so admin sees the real situation
      setDownloadedAt(item.zakeke_files_downloaded_at ?? null);
      console.error("mark downloaded failed", error.message);
    }
  };

  useEffect(() => {
    if (!hasZakeke || ready) return;
    let cancelled = false;
    if (!syncTriggered.current) {
      syncTriggered.current = true;
      supabase.functions.invoke("zakeke-files-sync").catch(() => {});
    }
    const poll = async () => {
      const { data } = await supabase
        .from("order_items")
        .select("zakeke_print_files")
        .eq("id", item.id)
        .maybeSingle();
      if (!cancelled && data) setFiles(data.zakeke_print_files);
    };
    const pollId = window.setInterval(poll, 20000);
    const tickId = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [hasZakeke, ready, item.id]);

  if (!hasZakeke) return null;

  const baseClasses =
    variant === "block" ? "w-full" : "w-full sm:w-auto";

  if (!ready) {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const elapsedLabel = mins > 0 ? `${mins} min ${secs}s` : `${secs}s`;
    return (
      <div
        className={`inline-flex items-center gap-2 text-[11px] font-body font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded ${baseClasses}`}
        title="Zakeke joprojām sagatavo augstas izšķirtspējas drukas failus."
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span className="flex-1 text-left leading-tight">
          Drukas faili gatavojas…
          <span className="block text-[10px] text-amber-700/80 font-normal">
            <Clock className="inline w-2.5 h-2.5 -mt-0.5 mr-0.5" />
            {elapsedLabel} · pārbaudām automātiski
          </span>
        </span>
      </div>
    );
  }

  const list = normalize(files);
  // De-duplicate by URL
  const seen = new Set<string>();
  const unique = list.filter((f) => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });

  // Sort: print files first (front, back...), then mockups, then zip/other
  const order = { print: 0, mockup: 1, other: 2, zip: 3 } as const;
  unique.sort((a, b) => order[a.kind] - order[b.kind]);

  // Keep only raster PNG/JPG print files. Hide DXF, PDF, SVG, ZIP and any
  // vector/source files — admins only need the production raster.
  const isRaster = (f: NormalizedFile): boolean => {
    const ext = (f.ext || "").toLowerCase();
    if (ext) return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp";
    // Unknown extension — accept only if URL strongly hints at PNG/JPG
    const u = f.url.toLowerCase();
    return /\.png(\?|#|$)|\.jpe?g(\?|#|$)|\.webp(\?|#|$)|image\/(png|jpe?g|webp)/.test(u);
  };
  const printable = unique.filter((f) => f.kind === "print" && isRaster(f));

  // Build the list of mockup preview URLs (front, back, …) coming from
  // Zakeke's previews[] array. Falls back to the single thumbnail URL when
  // we don't have the full list (older orders).
  const previewList: string[] = (() => {
    const raw = item.zakeke_preview_urls;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter((u): u is string => typeof u === "string" && !!u);
    }
    if (item.zakeke_thumbnail_url) return [item.zakeke_thumbnail_url];
    return [];
  })();
  // Always show product mockups from zakeke_preview_urls — they live separately
  // from zakeke_print_files which holds only production assets.
  const fallbackPreviews = previewList;

  const previewLabel = (url: string, idx: number, total: number) => {
    const u = url.toLowerCase();
    if (/front|priekš/.test(u)) return "Priekša";
    if (/back|aizmug/.test(u)) return "Aizmugure";
    if (/left|kreis/.test(u)) return "Kreisā";
    if (/right|lab/.test(u)) return "Labā";
    if (total === 1) return "Mockup";
    if (idx === 0) return "Priekša";
    if (idx === 1) return "Aizmugure";
    return `Mockup ${idx + 1}`;
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("zakeke-print-files", {
        body: { order_item_id: item.id, force: true },
      });
      if (error) throw error;
      if (data?.files) {
        setFiles(data.files);
        toast.success("Drukas faili atjaunoti");
      } else {
        toast.info("Zakeke vēl gatavo failus — pamēģini pēc minūtes");
      }
    } catch (e: any) {
      toast.error(`Neizdevās atjaunot: ${e?.message ?? e}`);
    } finally {
      setRegenerating(false);
    }
  };

  if (printable.length === 0 && fallbackPreviews.length === 0) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${baseClasses}`}>
        <span className="text-[11px] text-muted-foreground italic">Nav pieejamu failu</span>
        <button
          type="button"
          disabled={regenerating}
          onClick={regenerate}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded border border-amber-500/40 bg-amber-50 text-amber-900 hover:bg-amber-100 px-2 py-1.5 disabled:opacity-60"
        >
          {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
          <span>{regenerating ? "Pieprasām…" : "Pieprasīt drukas failus"}</span>
        </button>
      </div>
    );
  }

  const hasRealPrint = printable.length > 0;

  return (
    <>
      <div className={`flex flex-wrap gap-1.5 ${baseClasses}`}>
        {printable.map((f, i) => {
          const Icon =
            f.kind === "mockup"
              ? FileImage
              : f.kind === "zip"
                ? FileArchive
                : FileText;
          const isMockup = f.kind === "mockup" && ["png", "jpg", "jpeg", "webp"].includes(f.ext);
          const isDownloading = downloadingUrl === f.url;
          const friendlyName = buildFriendlyName(
            f,
            {
              orderNumber,
              clientName,
              quantity: item.quantity,
              size: item.size,
              isBulk: item.is_bulk,
              selectedSizes: item.selected_sizes,
            },
            i,
          );
          const isDownloaded = f.kind === "print" && !!downloadedAt;
          return (
            <div
              key={`${f.url}-${i}`}
              className={`inline-flex items-stretch text-[11px] font-semibold rounded overflow-hidden border ${
                isDownloaded ? "border-emerald-600/40" : "border-primary/30"
              }`}
            >
              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  setDownloadingUrl(f.url);
                  // Safety: never let the spinner get stuck longer than 65s,
                  // even if something inside triggerDownload misbehaves.
                  const stuckGuard = window.setTimeout(() => setDownloadingUrl(null), 65_000);
                  try {
                    await triggerDownload(f, friendlyName, item.id);
                  } finally {
                    window.clearTimeout(stuckGuard);
                    setDownloadingUrl(null);
                  }
                  // Fire-and-forget: marking the row as downloaded must NEVER
                  // block the button reset — DB write was previously awaited
                  // and could leave the button locked if the network stalled.
                  if (f.kind === "print") {
                    markDownloaded().catch((e) =>
                      console.error("markDownloaded failed", e),
                    );
                  }
                }}
                className={`inline-flex items-center gap-1.5 disabled:opacity-80 disabled:cursor-wait px-2 py-1.5 ${
                  isDownloaded
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                title={
                  isDownloaded
                    ? `Lejupielādēts ${new Date(downloadedAt!).toLocaleString("lv-LV")} — klikšķini, lai lejupielādētu vēlreiz`
                    : `Lejupielādēt ${friendlyName}`
                }
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="max-w-[140px] truncate">Lādējas…</span>
                  </>
                ) : (
                  <>
                    {isDownloaded ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="max-w-[140px] truncate">{sideLabel(f, i)}</span>
                    <Download className="w-3 h-3 opacity-80" />
                  </>
                )}
              </button>
              {isMockup && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(f.url)}
                  className={`inline-flex items-center px-1.5 ${
                    isDownloaded
                      ? "bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/25"
                      : "bg-primary/15 text-primary hover:bg-primary/25"
                  }`}
                  title="Apskatīt mockup"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {fallbackPreviews.map((url, idx) => (
          <button
            key={`preview-${idx}-${url}`}
            type="button"
            onClick={() => setPreviewUrl(url)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded border border-primary/30 bg-primary/15 text-primary hover:bg-primary/25 px-2 py-1.5"
            title="Apskatīt mockup"
          >
            <FileImage className="w-3.5 h-3.5" />
            <span>{previewLabel(url, idx, fallbackPreviews.length)}</span>
            <Eye className="w-3 h-3 opacity-80" />
          </button>
        ))}
        {!hasRealPrint && (
          <button
            type="button"
            disabled={regenerating}
            onClick={regenerate}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded border border-amber-500/40 bg-amber-50 text-amber-900 hover:bg-amber-100 px-2 py-1.5 disabled:opacity-60"
            title="Pieprasīt no Zakeke augstas izšķirtspējas drukas failus"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileImage className="w-3.5 h-3.5" />
            )}
            <span>{regenerating ? "Pieprasām…" : "Pieprasīt drukas failus"}</span>
          </button>
        )}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
            aria-label="Aizvērt"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewUrl}
            alt="Mockup priekšskatījums"
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
