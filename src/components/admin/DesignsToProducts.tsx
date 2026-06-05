import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Check, Image as ImageIcon, Shirt, Search, Wand2, Sparkles, Upload, Move, Maximize2 } from "lucide-react";
import { composeMockup } from "@/lib/imageCrop";

type DesignItem = {
  id: string;
  name: string;
  url: string;
  source: "library" | "campaign";
  createdAt: string;
};

type ColorVariant = { name: string; hex: string; images: string[] };
type CatalogProduct = {
  id: string;
  name: string;
  name_lv: string | null;
  category: string;
  sizes: string[] | null;
  description: string | null;
  description_lv: string | null;
  color_variants: ColorVariant[];
  print_area: { x: number; y: number; w: number; h: number } | null;
};

// Chest print area (centered horizontally, upper torso). Avoids belly placement.
const DEFAULT_PRINT_AREA = { x: 0.32, y: 0.18, w: 0.36, h: 0.3 };
const DEFAULT_PRICE = 25;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "produkts";
}

export function DesignsToProducts() {
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string>("");
  const [selectedBases, setSelectedBases] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "library" | "campaign">("all");
  const [price, setPrice] = useState<string>(String(DEFAULT_PRICE));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Manual print placement adjustments (applied on top of each base's print_area)
  const [offsetY, setOffsetY] = useState(0); // -0.15 .. +0.15 of mockup height
  const [scale, setScale] = useState(1);     // 0.6 .. 1.4

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: lib }, { data: camp }, { data: prods }] = await Promise.all([
        supabase.from("design_library").select("id,name,file_path,created_at").order("created_at", { ascending: false }),
        supabase.from("campaign_designs" as any).select("id,prompt,image_url,created_at,product_id").order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id,name,name_lv,category,sizes,description,description_lv,color_variants,print_area")
          .eq("customizable", true)
          .eq("is_draft", false)
          .order("name"),
      ]);

      const items: DesignItem[] = [];

      for (const d of (lib || []) as any[]) {
        const url = supabase.storage.from("design-library").getPublicUrl(d.file_path).data.publicUrl;
        items.push({ id: `lib:${d.id}`, name: d.name, url, source: "library", createdAt: d.created_at });
      }

      const campRows = ((camp || []) as any[]).filter((r) => r.image_url);
      const paths = campRows.map((r) => r.image_url as string);
      const signedMap: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("campaign-assets").createSignedUrls(paths, 60 * 60);
        (signed || []).forEach((s, i) => { if (s.signedUrl) signedMap[paths[i]] = s.signedUrl; });
      }
      for (const r of campRows) {
        const url = signedMap[r.image_url];
        if (!url) continue;
        items.push({
          id: `camp:${r.id}`,
          name: (r.prompt || "AI dizains").slice(0, 60),
          url,
          source: "campaign",
          createdAt: r.created_at,
        });
      }

      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setDesigns(items);

      setCatalog(((prods as any[]) || []).map((p) => ({
        ...p,
        color_variants: Array.isArray(p.color_variants) ? p.color_variants : [],
        print_area: p.print_area ?? null,
      })));
    } catch (e: any) {
      toast.error("Neizdevās ielādēt: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }

  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => sourceFilter === "all" || d.source === sourceFilter);
  }, [designs, sourceFilter]);

  const availableBases = useMemo(
    () => catalog.filter((p) => p.color_variants.length > 0 && p.color_variants.some((cv) => cv.images?.[0])),
    [catalog],
  );

  const filteredBases = useMemo(() => {
    if (!search.trim()) return availableBases;
    const s = search.toLowerCase();
    return availableBases.filter((p) => (p.name_lv || p.name).toLowerCase().includes(s));
  }, [availableBases, search]);

  const selectedDesign = designs.find((d) => d.id === selectedDesignId) || null;

  // Preview base = first selected base with at least one color image
  const previewBase = useMemo(() => {
    const sel = availableBases.filter((p) => selectedBases.has(p.id));
    return sel[0] ?? null;
  }, [availableBases, selectedBases]);
  const previewColor = previewBase?.color_variants.find((cv) => cv.images?.[0]) ?? null;
  const previewArea = useMemo(() => {
    const base = previewBase?.print_area ?? DEFAULT_PRINT_AREA;
    return adjustPrintArea(base, offsetY, scale);
  }, [previewBase, offsetY, scale]);

  function toggleBase(id: string) {
    setSelectedBases((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const totalSteps = useMemo(() => {
    let n = 0;
    for (const p of availableBases) {
      if (!selectedBases.has(p.id)) continue;
      n += p.color_variants.filter((cv) => cv.images?.[0]).length;
    }
    return n;
  }, [availableBases, selectedBases]);

  async function generate() {
    if (!selectedDesign) { toast.error("Izvēlies dizainu"); return; }
    if (selectedBases.size === 0) { toast.error("Izvēlies vismaz vienu kreklu"); return; }
    const priceNum = parseFloat(price.replace(",", "."));
    if (!isFinite(priceNum) || priceNum < 0) { toast.error("Nederīga cena"); return; }

    setBusy(true);
    setProgress({ done: 0, total: totalSteps });
    let done = 0;
    let createdCount = 0;
    try {
      const selectedProducts = availableBases.filter((p) => selectedBases.has(p.id));
      for (const baseProduct of selectedProducts) {
        const baseArea = baseProduct.print_area ?? DEFAULT_PRINT_AREA;
        const printArea = adjustPrintArea(baseArea, offsetY, scale);
        const variants: ColorVariant[] = [];
        const eligible = baseProduct.color_variants.filter((cv) => cv.images?.[0]);
        for (let vi = 0; vi < eligible.length; vi++) {
          const cv = eligible[vi];
          try {
            const blob = await composeMockup({
              mockupUrl: cv.images[0],
              designUrl: selectedDesign.url,
              printArea,
              baseColorHex: cv.hex,
              maxWidth: 1400,
            });
            const path = `manual/${selectedDesign.id.replace(":", "_")}/${baseProduct.id}/${vi}-${slugify(cv.name)}-${Date.now().toString(36)}.jpg`;
            const up = await supabase.storage.from("product-images").upload(path, blob, {
              contentType: "image/jpeg", upsert: true,
            });
            if (up.error) throw up.error;
            const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
            variants.push({ name: cv.name, hex: cv.hex || "#888888", images: [publicUrl] });
          } catch (e: any) {
            console.error("Mockup failed", baseProduct.id, cv.name, e);
            toast.error(`${baseProduct.name} (${cv.name}): mockup neizdevās`);
          }
          done++; setProgress({ done, total: totalSteps });
        }

        if (variants.length === 0) continue;

        const baseName = baseProduct.name_lv || baseProduct.name;
        const productName = `${selectedDesign.name} — ${baseName}`;
        const slug = `${slugify(selectedDesign.name)}-${slugify(baseName)}-${Date.now().toString(36)}`;
        const payload: any = {
          name: productName,
          name_lv: productName,
          name_en: null,
          slug,
          description: baseProduct.description ?? null,
          description_lv: baseProduct.description_lv ?? baseProduct.description ?? null,
          description_en: null,
          price: priceNum,
          category: baseProduct.category,
          sizes: baseProduct.sizes ?? ["S", "M", "L", "XL"],
          colors: variants.map((v) => v.name),
          customizable: false,
          color_variants: variants,
          image_url: variants[0].images[0],
          in_stock: true,
          is_draft: true,
          status: "draft",
          print_offset_y: offsetY,
          print_scale: scale,
          available_from: new Date().toISOString(),
          always_available: false,
        };
        const { error } = await supabase.from("products").insert(payload);
        if (error) {
          console.error("Insert product failed", error);
          toast.error(`${baseName}: produkts neizveidojās`);
        } else {
          createdCount++;
        }
      }
      toast.success(`Izveidoti ${createdCount} melnraksta produkti. Pārbaudi sadaļā Melnraksti.`);
      setSelectedBases(new Set());
    } catch (e: any) {
      console.error(e);
      toast.error("Ģenerēšana neizdevās: " + (e?.message || ""));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-display">Dizaini → Krekli</h2>
        <p className="text-xs sm:text-sm text-muted-foreground font-body">
          Izvēlies dizainu (no bibliotēkas vai AI kampaņām) un kreklus, uz kuriem to uzlikt — sistēma izveidos gatavus melnraksta produktus ar mockup attēliem.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4">
        {/* Designs */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ImageIcon className="w-4 h-4 text-primary" />
              <h3 className="font-display text-base">1. Dizains</h3>
              {selectedDesign && (
                <Badge variant="secondary" className="ml-auto text-[10px] max-w-[180px] truncate">{selectedDesign.name}</Badge>
              )}
            </div>

            <div className="flex gap-1 text-xs">
              {(["all", "library", "campaign"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`px-2 py-1 rounded border font-body ${sourceFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {s === "all" ? "Visi" : s === "library" ? "Bibliotēka" : "AI kampaņas"}
                </button>
              ))}
              <span className="ml-auto self-center text-[10px] text-muted-foreground">{filteredDesigns.length} dizaini</span>
            </div>

            {filteredDesigns.length === 0 ? (
              <div className="text-xs text-muted-foreground font-body p-4 text-center border border-dashed rounded">
                <Upload className="w-4 h-4 mx-auto mb-2 opacity-60" />
                Nav dizainu. Aug&scaron;upiel&#x0101;d&#x0113; Bulk Studio bibliot&#x0113;k&#x0101; vai &#x0123;ener&#x0113; Autopilot&#x0101;.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredDesigns.map((d) => {
                  const sel = selectedDesignId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDesignId(d.id)}
                      className={`relative aspect-square rounded border-2 overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px] ${sel ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"}`}
                    >
                      <img src={d.url} alt={d.name} className="w-full h-full object-contain p-1" loading="lazy" />
                      {sel && <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                      <div className="absolute top-1 left-1">
                        <Badge variant={d.source === "campaign" ? "default" : "secondary"} className="text-[8px] px-1 py-0 h-4">
                          {d.source === "campaign" ? <><Sparkles className="w-2 h-2 mr-0.5" />AI</> : "Lib"}
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate font-body">{d.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bases */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary" />
              <h3 className="font-display text-base">2. Krekli</h3>
              <Badge variant="secondary" className="ml-auto text-[10px]">{selectedBases.size} izvēlēti</Badge>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Meklēt kreklu…"
                className="w-full pl-8 pr-2 py-1.5 rounded border border-border bg-card text-sm font-body"
              />
            </div>

            {filteredBases.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body p-4 text-center">
                Nav customizable produktu ar krāsu bildēm. Atver Produkti un atzīmē customizable=true.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {filteredBases.map((p) => {
                  const items = p.color_variants.filter((cv) => cv.images?.[0]);
                  const sel = selectedBases.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleBase(p.id)}
                      className={`w-full text-left rounded border-2 p-2 transition ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-primary border-primary" : "border-border"}`}>
                          {sel && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-sm truncate">{p.name_lv || p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.category} · {items.length} krāsas{p.print_area ? "" : " · ⚠ print zona nav uzstādīta"}
                          </div>
                        </div>
                        <div className="flex -space-x-1">
                          {items.slice(0, 6).map((cv, i) => (
                            <div key={i} className="w-4 h-4 rounded-full border border-background" style={{ background: cv.hex || "#888" }} title={cv.name} />
                          ))}
                          {items.length > 6 && <div className="w-4 h-4 rounded-full bg-muted text-[8px] flex items-center justify-center">+{items.length - 6}</div>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-body text-muted-foreground">Cena (€):</label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-8 w-24 text-sm"
                  inputMode="decimal"
                />
              </div>

              {/* Manual print placement */}
              <div className="rounded border border-border p-2 space-y-2 bg-muted/30">
                <div className="flex items-center gap-1.5 text-[11px] font-body text-muted-foreground">
                  <Move className="w-3 h-3" /> Drukas novietojums
                  <button
                    type="button"
                    onClick={() => { setOffsetY(0); setScale(1); }}
                    className="ml-auto text-[10px] underline hover:text-foreground"
                  >atiestatīt</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-body space-y-1">
                    <div className="flex justify-between"><span>Vertikāli</span><span className="text-muted-foreground">{(offsetY * 100).toFixed(0)}%</span></div>
                    <input
                      type="range" min={-0.15} max={0.25} step={0.01}
                      value={offsetY}
                      onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </label>
                  <label className="text-[10px] font-body space-y-1">
                    <div className="flex justify-between"><span>Izmērs</span><span className="text-muted-foreground">{(scale * 100).toFixed(0)}%</span></div>
                    <input
                      type="range" min={0.5} max={1.4} step={0.05}
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </label>
                </div>
                {previewBase && previewColor && selectedDesign && (
                  <div className="relative w-full max-w-[180px] mx-auto aspect-[3/4] bg-card rounded overflow-hidden border border-border">
                    <img src={previewColor.images[0]} alt="" className="absolute inset-0 w-full h-full object-contain" />
                    <img
                      src={selectedDesign.url}
                      alt=""
                      className="absolute object-contain pointer-events-none"
                      style={{
                        left: `${previewArea.x * 100}%`,
                        top: `${previewArea.y * 100}%`,
                        width: `${previewArea.w * 100}%`,
                        height: `${previewArea.h * 100}%`,
                      }}
                    />
                    <div
                      className="absolute border border-primary/60 border-dashed pointer-events-none"
                      style={{
                        left: `${previewArea.x * 100}%`,
                        top: `${previewArea.y * 100}%`,
                        width: `${previewArea.w * 100}%`,
                        height: `${previewArea.h * 100}%`,
                      }}
                    />
                  </div>
                )}
                {!previewBase && (
                  <p className="text-[10px] text-muted-foreground font-body text-center">Izvēlies kreklu, lai redzētu priekšskatījumu</p>
                )}
              </div>

              {progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground font-body">
                    <span>Ģenerē mockup…</span>
                    <span>{progress.done}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
                  </div>
                </div>
              )}
              <Button
                onClick={generate}
                disabled={busy || !selectedDesign || selectedBases.size === 0}
                className="w-full bg-primary text-primary-foreground"
              >
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Izveidot kartītes ({totalSteps} mockup)
              </Button>
              <p className="text-[10px] text-muted-foreground font-body text-center">
                Produkti tiek izveidoti kā melnraksti. Pārskati tos sadaļā <strong>Melnraksti</strong> un noņem atzīmi, lai publicētu.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}