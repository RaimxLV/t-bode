import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, X, Loader2, FileImage } from "lucide-react";
import { renderPrintReady, urlToImage } from "@/lib/imageCrop";
import type { PrintPreset } from "./PrintPresets";

interface Props {
  designName: string;
  designUrl: string;
  onClose: () => void;
}

export function PrintExportDialog({ designName, designUrl, onClose }: Props) {
  const [presets, setPresets] = useState<PrintPreset[]>([]);
  const [presetId, setPresetId] = useState<string>("");
  const [bound, setBound] = useState<"width" | "height">("width");
  const [maxCm, setMaxCm] = useState<number>(20);
  const [trim, setTrim] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("print_presets")
        .select("*").eq("is_active", true).order("sort_order");
      const list = (data as PrintPreset[]) || [];
      setPresets(list);
      if (list[0]) setPresetId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try { const img = await urlToImage(designUrl); setImgSize({ w: img.naturalWidth, h: img.naturalHeight }); }
      catch { setImgSize(null); }
    })();
  }, [designUrl]);

  const preset = useMemo(() => presets.find((p) => p.id === presetId) || null, [presets, presetId]);

  // Clamp maxCm to the chosen bound on the preset
  useEffect(() => {
    if (!preset) return;
    const limit = bound === "width" ? Number(preset.width_cm) : Number(preset.height_cm);
    if (maxCm > limit) setMaxCm(limit);
  }, [preset, bound]); // eslint-disable-line

  // Compute the final design size on the canvas for live preview
  const finalSize = useMemo(() => {
    if (!preset || !imgSize) return null;
    const aspect = imgSize.w / imgSize.h;
    let wCm: number, hCm: number;
    if (bound === "width") { wCm = maxCm; hCm = maxCm / aspect; }
    else { hCm = maxCm; wCm = maxCm * aspect; }
    const fits = wCm <= Number(preset.width_cm) + 1e-6 && hCm <= Number(preset.height_cm) + 1e-6;
    return { wCm, hCm, fits };
  }, [preset, imgSize, bound, maxCm]);

  async function doExport() {
    if (!preset) { toast.error("Izvēlies drukas izmēru"); return; }
    if (maxCm <= 0) { toast.error("Izmēram jābūt > 0"); return; }
    setBusy(true);
    try {
      const { blob, widthPx, heightPx } = await renderPrintReady({
        designUrl,
        widthCm: Number(preset.width_cm),
        heightCm: Number(preset.height_cm),
        dpi: preset.dpi,
        maxCm,
        bound,
        trimDesign: trim,
      });
      const safe = designName.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "design";
      const fname = `${safe}_${preset.width_cm}x${preset.height_cm}cm_${preset.dpi}dpi.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Lejupielādēts (${widthPx}×${heightPx} px)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Eksports neizdevās");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl bg-background border border-border" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5 text-primary" /> Sagatavot drukai
              </h3>
              <p className="text-xs text-muted-foreground font-body truncate max-w-md">{designName}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
            {/* Preview */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-body">Priekšskatījums (proporcionāls)</p>
              <PreviewCanvas preset={preset} designUrl={designUrl} finalSize={finalSize} />
              {preset && (
                <div className="text-[11px] text-muted-foreground font-body">
                  Audekls: {Number(preset.width_cm)} × {Number(preset.height_cm)} cm @ {preset.dpi} DPI
                  &nbsp;→&nbsp; {Math.round((Number(preset.width_cm) / 2.54) * preset.dpi)} × {Math.round((Number(preset.height_cm) / 2.54) * preset.dpi)} px
                </div>
              )}
              {finalSize && (
                <div className={`text-[11px] font-body ${finalSize.fits ? "text-muted-foreground" : "text-destructive"}`}>
                  Dizains: {finalSize.wCm.toFixed(1)} × {finalSize.hCm.toFixed(1)} cm
                  {!finalSize.fits && " — neietilpst audeklā!"}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-body">Drukas izmērs</span>
                <select value={presetId} onChange={(e) => setPresetId(e.target.value)}
                  className="px-2 py-2 rounded border border-border bg-card text-sm font-body">
                  <option value="">— Izvēlies —</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({Number(p.width_cm)}×{Number(p.height_cm)} cm)
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="text-xs text-muted-foreground font-body">Mērogot pēc</span>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <button
                    onClick={() => setBound("width")}
                    className={`px-2 py-1.5 rounded border text-xs font-body ${bound === "width" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}
                  >Max platums</button>
                  <button
                    onClick={() => setBound("height")}
                    className={`px-2 py-1.5 rounded border text-xs font-body ${bound === "height" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}
                  >Max augstums</button>
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-body">
                  {bound === "width" ? "Platums" : "Augstums"} (cm)
                </span>
                <input type="number" min={0.5} step={0.1} value={maxCm}
                  onChange={(e) => setMaxCm(parseFloat(e.target.value) || 0)}
                  className="px-2 py-1.5 rounded border border-border bg-card text-sm font-body" />
                {preset && (
                  <span className="text-[10px] text-muted-foreground font-body">
                    Max: {bound === "width" ? Number(preset.width_cm) : Number(preset.height_cm)} cm
                  </span>
                )}
              </label>

              <label className="flex items-center gap-2 text-xs font-body cursor-pointer">
                <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
                <span>Apgriezt caurspīdīgās malas (PNG)</span>
              </label>

              <Button onClick={doExport} disabled={busy || !preset || !finalSize?.fits}
                className="w-full bg-primary text-primary-foreground">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Lejupielādēt PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewCanvas({
  preset, designUrl, finalSize,
}: {
  preset: PrintPreset | null;
  designUrl: string;
  finalSize: { wCm: number; hCm: number; fits: boolean } | null;
}) {
  if (!preset) {
    return (
      <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground font-body">
        Izvēlies drukas izmēru
      </div>
    );
  }
  const aspect = Number(preset.width_cm) / Number(preset.height_cm);
  return (
    <div className="w-full flex items-center justify-center bg-muted/30 rounded-lg border border-border p-4">
      <div
        className="relative bg-white border border-border shadow-sm"
        style={{
          width: aspect >= 1 ? 360 : 360 * aspect,
          height: aspect >= 1 ? 360 / aspect : 360,
        }}
      >
        {finalSize && (
          <div
            className="absolute"
            style={{
              left: `${((Number(preset.width_cm) - finalSize.wCm) / 2 / Number(preset.width_cm)) * 100}%`,
              top: `${((Number(preset.height_cm) - finalSize.hCm) / 2 / Number(preset.height_cm)) * 100}%`,
              width: `${(finalSize.wCm / Number(preset.width_cm)) * 100}%`,
              height: `${(finalSize.hCm / Number(preset.height_cm)) * 100}%`,
            }}
          >
            <img src={designUrl} alt="" className="w-full h-full object-contain" />
            <div className={`absolute inset-0 border-2 ${finalSize.fits ? "border-primary/40" : "border-destructive"} pointer-events-none`} />
          </div>
        )}
      </div>
    </div>
  );
}