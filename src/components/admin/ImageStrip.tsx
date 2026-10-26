import { useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { moveItem } from "@/lib/readyMadeProducts";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  /** Uploads files and returns public URLs. Never deletes storage. */
  upload: (files: File[]) => Promise<string[]>;
  label: string;
  thumbClass?: string;
}

/**
 * Editable list of image references. Removing only drops the reference from this
 * product; the shared file in storage is never deleted, so duplicates stay safe.
 */
export function ImageStrip({ images, onChange, upload, label, thumbClass = "w-20 h-24" }: Props) {
  const [busy, setBusy] = useState<number | "add" | null>(null);

  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy("add");
    try { const urls = await upload(files); if (urls.length) onChange([...images, ...urls]); }
    finally { setBusy(null); }
  };
  const replace = async (idx: number, files: File[]) => {
    if (!files.length) return;
    setBusy(idx);
    try {
      const [url] = await upload(files.slice(0, 1));
      if (url) onChange(images.map((img, i) => (i === idx ? url : img)));
    } finally { setBusy(null); }
  };

  const btn = "w-6 h-6 rounded-full bg-background/90 border border-border flex items-center justify-center text-foreground disabled:opacity-30";

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img, idx) => (
        <div key={`${img}-${idx}`} className="relative">
          <img src={img} alt={`${label} ${idx + 1}`} className={`${thumbClass} object-cover rounded border border-border`} />
          {idx === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-body font-semibold px-1 rounded bg-primary text-primary-foreground">1.</span>}
          <button type="button" onClick={() => onChange(images.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" aria-label={`Noņemt ${label} ${idx + 1}`}>
            <X className="w-3 h-3" />
          </button>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
            <button type="button" className={btn} disabled={idx === 0} onClick={() => onChange(moveItem(images, idx, idx - 1))} aria-label="Pārvietot pa kreisi"><ChevronLeft className="w-3 h-3" /></button>
            <label className={`${btn} cursor-pointer`} aria-label="Aizstāt bildi" title="Aizstāt">
              {busy === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void replace(idx, Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </label>
            <button type="button" className={btn} disabled={idx === images.length - 1} onClick={() => onChange(moveItem(images, idx, idx + 1))} aria-label="Pārvietot pa labi"><ChevronRight className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
      <label className="cursor-pointer" aria-label={`Pievienot: ${label}`}>
        <div className={`${thumbClass} border-2 border-dashed border-border rounded flex items-center justify-center hover:border-primary/40 hover:bg-muted transition-colors`}>
          {busy === "add" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
        </div>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>
    </div>
  );
}
