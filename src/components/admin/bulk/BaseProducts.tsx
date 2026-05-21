import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, Shirt, Plus, Image as ImageIcon, Save, X, Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  colors: string[] | null;
  sizes: string[] | null;
}

interface BaseProduct {
  id: string;
  product_id: string | null;
  name: string;
  color_name: string;
  color_hex: string | null;
  mockup_path: string;
  print_area: { x: number; y: number; w: number; h: number };
  sort_order: number;
  is_active: boolean;
  mockup_width_cm: number;
  mockup_height_cm: number;
}

const BUCKET = "mockup-templates";
const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

// Common color → hex map (extend as needed)
const COLOR_HEX: Record<string, string> = {
  white: "#ffffff", black: "#000000", red: "#dc2626", blue: "#2563eb",
  pink: "#ec4899", burgundy: "#7a1f2b", "dark blue": "#1e3a8a", "dark green": "#14532d",
  gray: "#6b7280", green: "#16a34a", "light blue": "#7dd3fc", lime: "#84cc16",
  natural: "#f5ecd9", orange: "#f97316", purple: "#9333ea", yellow: "#facc15",
  khaki: "#a89968", navy: "#0c1e3e", "heather grey": "#9ca3af",
  anthracite: "#2d2d2d", caramel: "#a77043", mustards: "#d4a017",
  neutral: "#e7dcc8", "vintage white": "#f3ecd9", aloe: "#b6c9a3", "aqua blue": "#7fc8d6",
  "desert dust": "#d4b896", "ink gray": "#3b3b40", gold: "#d4a84a", silver: "#c0c0c0",
  "light oxford": "#cfd2d6", magic: "#1a1a1a", royal: "#1d4ed8", "kelly green": "#22c55e",
  lemon: "#fff44f", "blue atol": "#1aa3d6", "bottle green": "#0f3d2e",
  "convoy gray": "#7a7d80", "indigo blue": "#2a3a8c", "mineral blue": "#3a5a78",
  mocha: "#6b4a3a", olive: "#6b6f3a", "urban gray": "#5a5a5a", "natural raw": "#e8dcc4",
};
function hexFor(name: string) {
  return COLOR_HEX[name.toLowerCase()] ?? "#888888";
}

export function BaseProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bases, setBases] = useState<BaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [editingPrintArea, setEditingPrintArea] = useState<BaseProduct | null>(null);

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: prods }, { data: bs }] = await Promise.all([
      supabase.from("products").select("id, name, category, colors, sizes").order("name"),
      supabase.from("base_products").select("*").order("sort_order"),
    ]);
    setProducts((prods as Product[]) || []);
    setBases(((bs as any[]) || []).map((b) => ({
      ...b,
      print_area: b.print_area ?? { x: 0.3, y: 0.25, w: 0.4, h: 0.45 },
      mockup_width_cm: Number(b.mockup_width_cm ?? 50),
      mockup_height_cm: Number(b.mockup_height_cm ?? 70),
    })));
    setLoading(false);
  }

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const basesForSelected = useMemo(
    () => bases.filter((b) => b.product_id === selectedProductId),
    [bases, selectedProductId]
  );

  const missingColors = useMemo(() => {
    if (!selectedProduct) return [];
    const have = new Set(basesForSelected.map((b) => b.color_name.toLowerCase()));
    return (selectedProduct.colors ?? []).filter((c) => !have.has(c.toLowerCase()));
  }, [selectedProduct, basesForSelected]);

  function publicUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function uploadMockup(file: File, product: Product, colorName: string) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) { toast.error("Atbalstīti PNG/JPG/WebP"); return; }
    const safeColor = colorName.replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase();
    const path = `${product.id}/${safeColor}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined, upsert: false,
    });
    if (upErr) { toast.error(upErr.message); return; }
    const existing = bases.find((b) => b.product_id === product.id && b.color_name.toLowerCase() === colorName.toLowerCase());
    if (existing) {
      // replace
      await supabase.storage.from(BUCKET).remove([existing.mockup_path]);
      const { error } = await supabase.from("base_products").update({ mockup_path: path }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      toast.success(`${colorName} mockup atjaunināts`);
    } else {
      const { error } = await supabase.from("base_products").insert({
        product_id: product.id,
        name: product.name,
        color_name: colorName,
        color_hex: hexFor(colorName),
        mockup_path: path,
        sort_order: basesForSelected.length,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`${colorName} pievienots`);
    }
    await loadAll();
  }

  async function deleteBase(b: BaseProduct) {
    if (!confirm(`Dzēst bāzi "${b.name} — ${b.color_name}"?`)) return;
    await supabase.storage.from(BUCKET).remove([b.mockup_path]);
    await supabase.from("base_products").delete().eq("id", b.id);
    toast.success("Bāze dzēsta");
    await loadAll();
  }

  async function savePrintArea(b: BaseProduct, area: { x: number; y: number; w: number; h: number }) {
    const { error } = await supabase.from("base_products").update({ print_area: area }).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Print zona saglabāta");
    setEditingPrintArea(null);
    await loadAll();
  }

  async function savePrintAreaAndDims(
    b: BaseProduct,
    area: { x: number; y: number; w: number; h: number },
    dims: { mockup_width_cm: number; mockup_height_cm: number }
  ) {
    const { error } = await supabase.from("base_products").update({
      print_area: area,
      mockup_width_cm: dims.mockup_width_cm,
      mockup_height_cm: dims.mockup_height_cm,
    }).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Print zona saglabāta");
    setEditingPrintArea(null);
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Shirt className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-body text-muted-foreground">Izvēlies produktu:</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-body min-w-[260px]"
            >
              <option value="">— Izvēlēties —</option>
              {products.map((p) => {
                const count = bases.filter((b) => b.product_id === p.id).length;
                const total = (p.colors ?? []).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({count}/{total})
                  </option>
                );
              })}
            </select>
            {selectedProduct && (
              <Badge variant="secondary" className="capitalize">{selectedProduct.category}</Badge>
            )}
          </div>

          {!selectedProductId && (
            <p className="text-xs text-muted-foreground font-body">
              Katram produktam augšupielādē tukšu mockup foto katrai krāsai un atzīmē print zonu (kur dizains liksies virsū).
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !selectedProduct ? (
        <Card className="border border-dashed border-border">
          <CardContent className="p-12 text-center space-y-3">
            <Shirt className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="font-body text-muted-foreground">Izvēlies produktu, lai sāktu pievienot bāzes mockup.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Existing bases */}
          {basesForSelected.length > 0 && (
            <div>
              <h4 className="text-sm font-display mb-2">Pievienotās krāsas ({basesForSelected.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {basesForSelected.map((b) => (
                  <BaseCard
                    key={b.id}
                    base={b}
                    url={publicUrl(b.mockup_path)}
                    onDelete={() => deleteBase(b)}
                    onEditPrintArea={() => setEditingPrintArea(b)}
                    onReplace={(f) => uploadMockup(f, selectedProduct, b.color_name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Missing colors */}
          {missingColors.length > 0 && (
            <div>
              <h4 className="text-sm font-display mb-2 text-muted-foreground">Trūkst mockup ({missingColors.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {missingColors.map((c) => (
                  <MissingColorCard key={c} colorName={c} onUpload={(f) => uploadMockup(f, selectedProduct, c)} />
                ))}
              </div>
            </div>
          )}

          {missingColors.length === 0 && basesForSelected.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Check className="w-4 h-4 text-primary" />
              <p className="text-sm font-body text-foreground">Visas krāsas ir pievienotas — produkts gatavs ģeneratoram.</p>
            </div>
          )}
        </div>
      )}

      {editingPrintArea && (
        <PrintAreaEditor
          base={editingPrintArea}
          url={publicUrl(editingPrintArea.mockup_path)}
          onSave={(area, dims) => savePrintAreaAndDims(editingPrintArea, area, dims)}
          onCancel={() => setEditingPrintArea(null)}
        />
      )}
    </div>
  );
}

function BaseCard({
  base, url, onDelete, onEditPrintArea, onReplace,
}: {
  base: BaseProduct; url: string;
  onDelete: () => void; onEditPrintArea: () => void; onReplace: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pa = base.print_area;
  return (
    <Card className="border border-border overflow-hidden">
      <div className="relative aspect-square bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        <img src={url} alt={base.color_name} className="w-full h-full object-contain" />
        {/* Print area overlay */}
        <div
          className="absolute border-2 border-primary/80 bg-primary/10 pointer-events-none"
          style={{
            left: `${pa.x * 100}%`, top: `${pa.y * 100}%`,
            width: `${pa.w * 100}%`, height: `${pa.h * 100}%`,
          }}
        />
      </div>
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-border" style={{ background: base.color_hex || "#888" }} />
          <span className="text-xs font-body font-medium truncate flex-1">{base.color_name}</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={onEditPrintArea}>
            Print zona
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => fileRef.current?.click()} title="Aizvietot">
            <Upload className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <input
          ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onReplace(f); }}
        />
      </div>
    </Card>
  );
}

function MissingColorCard({ colorName, onUpload }: { colorName: string; onUpload: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <Card className="border border-dashed border-border">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full aspect-square flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
      >
        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Plus className="w-6 h-6 text-muted-foreground" />}
        <span className="text-xs font-body text-muted-foreground">Augšupielādēt</span>
      </button>
      <div className="p-2 flex items-center gap-1.5 border-t border-border">
        <span className="w-3 h-3 rounded-full border border-border" style={{ background: COLOR_HEX[colorName.toLowerCase()] ?? "#888" }} />
        <span className="text-xs font-body truncate">{colorName}</span>
      </div>
      <input
        ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (f) { setUploading(true); await onUpload(f); setUploading(false); }
        }}
      />
    </Card>
  );
}

// Interactive print area editor — drag to move, resize from corner
function PrintAreaEditor({
  base, url, onSave, onCancel,
}: {
  base: BaseProduct; url: string;
  onSave: (area: { x: number; y: number; w: number; h: number }) => void;
  onCancel: () => void;
}) {
  const [area, setArea] = useState(base.print_area);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; orig: typeof area } | null>(null);

  function onPointerDown(mode: "move" | "resize", e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...area } };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const o = dragRef.current.orig;
    if (dragRef.current.mode === "move") {
      setArea({
        x: Math.max(0, Math.min(1 - o.w, o.x + dx)),
        y: Math.max(0, Math.min(1 - o.h, o.y + dy)),
        w: o.w, h: o.h,
      });
    } else {
      setArea({
        x: o.x, y: o.y,
        w: Math.max(0.05, Math.min(1 - o.x, o.w + dx)),
        h: Math.max(0.05, Math.min(1 - o.y, o.h + dy)),
      });
    }
  }
  function onPointerUp() { dragRef.current = null; }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <Card className="w-full max-w-2xl bg-background border border-border" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg">Print zona — {base.name} ({base.color_name})</h3>
              <p className="text-xs text-muted-foreground font-body">Velc, lai pārvietotu. Velc apakšējo labo stūri, lai mainītu izmēru.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
          </div>

          <div
            ref={containerRef}
            className="relative w-full aspect-square bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:20px_20px] select-none touch-none rounded-lg overflow-hidden border border-border"
          >
            <img src={url} alt="" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            <div
              className="absolute border-2 border-primary bg-primary/15 cursor-move"
              style={{
                left: `${area.x * 100}%`, top: `${area.y * 100}%`,
                width: `${area.w * 100}%`, height: `${area.h * 100}%`,
              }}
              onPointerDown={(e) => onPointerDown("move", e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <div
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-sm cursor-se-resize border-2 border-background"
                onPointerDown={(e) => onPointerDown("resize", e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs font-body">
            <Field label="X" value={area.x} onChange={(v) => setArea((a) => ({ ...a, x: clamp(v, 0, 1 - a.w) }))} />
            <Field label="Y" value={area.y} onChange={(v) => setArea((a) => ({ ...a, y: clamp(v, 0, 1 - a.h) }))} />
            <Field label="W" value={area.w} onChange={(v) => setArea((a) => ({ ...a, w: clamp(v, 0.05, 1 - a.x) }))} />
            <Field label="H" value={area.h} onChange={(v) => setArea((a) => ({ ...a, h: clamp(v, 0.05, 1 - a.y) }))} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Atcelt</Button>
            <Button onClick={() => onSave(area)} className="bg-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> Saglabāt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number" min={0} max={1} step={0.01} value={Number(value.toFixed(3))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="px-2 py-1 rounded border border-border bg-card"
      />
    </label>
  );
}