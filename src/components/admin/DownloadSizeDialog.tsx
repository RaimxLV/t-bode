import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Loader2, X, Ruler } from "lucide-react";
import { urlToImage } from "@/lib/imageCrop";

const DPI = 300;

// Minimal pHYs injector (same logic as src/lib/printFile.ts)
function injectDpi(buf: ArrayBuffer, dpi: number): Blob {
  const src = new Uint8Array(buf);
  const insertAt = 8 + 25;
  const ppm = Math.round(dpi * 39.3701);
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  chunk[0] = 0; chunk[1] = 0; chunk[2] = 0; chunk[3] = 9;
  chunk[4] = 0x70; chunk[5] = 0x48; chunk[6] = 0x59; chunk[7] = 0x73;
  chunk[8]  = (ppm >>> 24) & 0xff;
  chunk[9]  = (ppm >>> 16) & 0xff;
  chunk[10] = (ppm >>> 8) & 0xff;
  chunk[11] = ppm & 0xff;
  chunk[12] = chunk[8]; chunk[13] = chunk[9]; chunk[14] = chunk[10]; chunk[15] = chunk[11];
  chunk[16] = 1;
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

interface Props {
  imageUrl: string;
  fileName: string;
  onClose: () => void;
}

export function DownloadSizeDialog({ imageUrl, fileName, onClose }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [widthCm, setWidthCm] = useState<number>(30);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const i = await urlToImage(imageUrl);
        if (!cancelled) setImg(i);
      } catch {
        toast.error("Neizdevās ielādēt bildi");
      }
    })();
    return () => { cancelled = true; };
  }, [imageUrl]);

  const calc = useMemo(() => {
    if (!img || !widthCm || widthCm <= 0) return null;
    const aspect = img.naturalWidth / img.naturalHeight;
    const heightCm = widthCm / aspect;
    const widthPx = Math.round((widthCm / 2.54) * DPI);
    const heightPx = Math.round((heightCm / 2.54) * DPI);
    return { aspect, heightCm, widthPx, heightPx };
  }, [img, widthCm]);

  async function doDownload() {
    if (!img || !calc) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = calc.widthPx;
      canvas.height = calc.heightPx;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas nav pieejams");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, calc.widthPx, calc.heightPx);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Neizdevās ģenerēt PNG");
      const buf = await blob.arrayBuffer();
      const finalBlob = injectDpi(buf, DPI);
      const safeName = fileName.replace(/\.(png|jpe?g|svg)$/i, "");
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-${widthCm}cm.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Lejupielādēts: ${widthCm} cm platumā (${calc.widthPx}×${calc.heightPx} px @ ${DPI} DPI)`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Lejupielāde neizdevās");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md bg-background border border-border" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Ruler className="w-5 h-5 text-primary" /> Lejupielādes izmērs
            </h3>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>

          <div className="aspect-square w-full bg-muted/30 rounded-lg border border-border flex items-center justify-center overflow-hidden">
            {img
              ? <img src={imageUrl} alt="" className="max-w-full max-h-full object-contain" />
              : <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-body">Platums (cm)</span>
            <Input
              type="number"
              min={1}
              step={0.5}
              value={widthCm}
              onChange={(e) => setWidthCm(parseFloat(e.target.value) || 0)}
              autoFocus
            />
          </label>

          {calc && (
            <div className="text-xs text-muted-foreground font-body space-y-0.5 bg-muted/30 rounded p-2">
              <div>Augstums: <span className="text-foreground font-medium">{calc.heightCm.toFixed(1)} cm</span> (proporcionāli)</div>
              <div>Izšķirtspēja: {calc.widthPx} × {calc.heightPx} px @ {DPI} DPI</div>
            </div>
          )}

          <Button
            onClick={doDownload}
            disabled={!calc || busy || widthCm <= 0}
            className="w-full bg-primary text-primary-foreground"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Lejupielādēt PNG
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}