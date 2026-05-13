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

const sideLabel = (f: NormalizedFile): string => {
  const s = `${f.side ?? ""} ${f.name} ${f.url}`.toLowerCase();
  if (/front/.test(s)) return "Priekša";
  if (/back/.test(s)) return "Aizmugure";
  if (/left/.test(s)) return "Kreisā";
  if (/right/.test(s)) return "Labā";
  if (f.kind === "mockup") return "Mockup";
  if (f.kind === "zip") return "ZIP arhīvs";
  if (f.side && f.side.toLowerCase() !== "png") return f.side;
  return f.name;
};

const slugify = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "fails";

const sideSlug = (f: NormalizedFile): string => {
  const label = sideLabel(f).toLowerCase();
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
  ctx: { orderNumber?: number | null; clientName?: string | null },
): string => {
  const parts: string[] = [];
  if (ctx.orderNumber != null) {
    parts.push(`TB-${String(ctx.orderNumber).padStart(4, "0")}`);
  }
  if (ctx.clientName) parts.push(slugify(ctx.clientName));
  parts.push(sideSlug(f));
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

const triggerDownload = async (f: NormalizedFile, friendlyName: string) => {
  try {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    // If we couldn't determine the extension up front (ended in .bin), use
    // the response's Content-Type to fix it before saving.
    let finalName = friendlyName;
    if (/\.bin$/i.test(finalName)) {
      const fromMime = extFromMime(blob.type || res.headers.get("content-type") || "");
      if (fromMime) finalName = swapExt(finalName, fromMime);
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      a.remove();
    }, 1500);
  } catch {
    // Fallback: open in new tab so admin can save manually
    window.open(f.url, "_blank", "noopener");
  }
};

export const ZakekePrintFilesButton = ({ item, variant = "inline", orderNumber, clientName }: Props) => {
  const [files, setFiles] = useState<any>(item.zakeke_print_files);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
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

  const hasMockup = unique.some(
    (f) => f.kind === "mockup" && ["png", "jpg", "jpeg", "webp"].includes(f.ext),
  );
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

  if (unique.length === 0 && fallbackPreviews.length === 0) {
    return (
      <div className="text-[11px] text-muted-foreground italic">
        Nav pieejamu failu
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap gap-1.5 ${baseClasses}`}>
        {downloadedAt && (
          <div
            className="inline-flex items-center gap-1 text-[10px] font-body font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
            title={`Lejupielādēts ${new Date(downloadedAt).toLocaleString("lv-LV")}`}
          >
            ✓ Lejupielādēts
          </div>
        )}
        {unique.map((f, i) => {
          const Icon =
            f.kind === "mockup"
              ? FileImage
              : f.kind === "zip"
                ? FileArchive
                : FileText;
          const isMockup = f.kind === "mockup" && ["png", "jpg", "jpeg", "webp"].includes(f.ext);
          const isDownloading = downloadingUrl === f.url;
          const friendlyName = buildFriendlyName(f, { orderNumber, clientName });
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
                  try {
                    await triggerDownload(f, friendlyName);
                    // Only print files (PDF/AI/EPS/SVG/TIFF/print) count as
                    // "ready for production". Mockup previews don't.
                    if (f.kind === "print") {
                      await markDownloaded();
                    }
                  } finally {
                    setDownloadingUrl(null);
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
                    <span className="max-w-[140px] truncate">{sideLabel(f)}</span>
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
