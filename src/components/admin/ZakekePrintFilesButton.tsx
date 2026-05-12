import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileArchive, Loader2, Clock } from "lucide-react";

interface Item {
  id: string;
  product_name?: string;
  created_at?: string;
  zakeke_design_id?: string | null;
  zakeke_order_id?: string | null;
  zakeke_order_item_id?: string | null;
  zakeke_print_files?: any;
}

interface Props {
  item: Item;
  variant?: "block" | "inline";
}

const filesReady = (f: any): boolean => {
  if (!f) return false;
  if (Array.isArray(f)) return f.length > 0;
  if (typeof f === "object") return Object.keys(f).length > 0;
  return false;
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    link.remove();
  }, 1500);
};

/**
 * Inline status + download button for Zakeke production files.
 *
 * Behaviour: while Zakeke is still building the print bundle we show a
 * "Gatavojas..." indicator with elapsed time. The component polls
 * `order_items.zakeke_print_files` every 20s and asks the
 * `zakeke-files-sync` edge function to attempt a backfill on mount,
 * so the employee does not have to keep clicking.
 */
export const ZakekePrintFilesButton = ({ item, variant = "inline" }: Props) => {
  const [files, setFiles] = useState<any>(item.zakeke_print_files);
  const [downloading, setDownloading] = useState(false);
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

  // Poll for readiness + trigger backfill once
  useEffect(() => {
    if (!hasZakeke || ready) return;

    let cancelled = false;

    // Ask the cron function to attempt a sync immediately (best-effort).
    if (!syncTriggered.current) {
      syncTriggered.current = true;
      supabase.functions.invoke("zakeke-files-sync").catch(() => {
        /* silent — cron will keep trying every 5 min */
      });
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
    const tickId = window.setInterval(
      () => setElapsed((s) => s + 1),
      1000,
    );
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [hasZakeke, ready, item.id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zakeke-print-files`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ order_item_id: item.id, zip: true }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const safe = (item.product_name || "item").replace(/[^a-z0-9]+/gi, "-");
      triggerBlobDownload(blob, `print-files-${safe}-${item.id.slice(0, 8)}.zip`);
      toast.success("ZIP lejupielādēts");
    } catch (e: any) {
      toast.error(e?.message || "Neizdevās lejupielādēt ZIP");
    } finally {
      setDownloading(false);
    }
  };

  if (!hasZakeke) return null;

  const baseClasses =
    variant === "block"
      ? "w-full justify-center"
      : "w-full sm:w-fit justify-center";

  if (!ready) {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const elapsedLabel =
      mins > 0 ? `${mins} min ${secs}s` : `${secs}s`;
    return (
      <div
        className={`inline-flex items-center gap-2 text-[11px] font-body font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded ${baseClasses}`}
        title="Zakeke joprojām sagatavo augstas izšķirtspējas drukas failus. Pārbaudām automātiski."
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

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded disabled:opacity-50 ${baseClasses}`}
      title="Lejupielādēt visus drukas failus kā ZIP"
    >
      {downloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileArchive className="w-3.5 h-3.5" />
      )}
      Lejupielādēt ZIP (drukas faili)
    </button>
  );
};