import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wand2, Loader2, Check, Image as ImageIcon, Shirt, Search } from "lucide-react";
import { composeMockup, urlToImage } from "@/lib/imageCrop";

interface DesignItem {
  id: string; name: string; file_path: string; category_id: string | null;
}
interface BaseRow {
  id: string; product_id: string | null; name: string;
  color_name: string; color_hex: string | null;
  mockup_path: string;
  print_area: { x: number; y: number; w: number; h: number };
  is_active: boolean;
}
interface Product {
  id: string; name: string; name_lv: string | null; category: string;
  sizes: string[] | null; description: string | null; description_lv: string | null;
}

const DESIGN_BUCKET = "design-library";
const MOCKUP_BUCKET = "mockup-templates";
const OUT_BUCKET = "generated-mockups";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "produkts";
}

export function Generator() {
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [bases, setBases] = useState<BaseRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<string>("");
  const [selectedBaseProducts, setSelectedBaseProducts] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: d }, { data: b }, { data: p }] = await Promise.all([
      supabase.from("design_library").select("id,name,file_path,category_id").order("created_at", { ascending: false }),
      supabase.from("base_products").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("products").select("id,name,name_lv,category,sizes,description,description_lv").order("name"),
    ]);
    setDesigns((d as DesignItem[]) || []);
    setBases(((b as any[]) || []).map((x) => ({
      ...x,
      print_area: x.print_area ?? { x: 0.3, y: 0.25, w: 0.4, h: 0.45 },
    })));
    setProducts((p as Product[]) || []);
    setLoading(false);
  }

  // Group bases by product_id; only show product groups that have at least one base
  const baseGroups = useMemo(() => {
    const map = new Map<string, BaseRow[]>();
    for (const b of bases) {
      if (!b.product_id) continue;
      const arr = map.get(b.product_id) ?? [];
      arr.push(b); map.set(b.product_id, arr);
    }
    return products
      .filter((p) => map.has(p.id))
      .filter((p) => !search || (p.name_lv || p.name).toLowerCase().includes(search.toLowerCase()))
      .map((p) => ({ product: p, items: map.get(p.id)! }));
  }, [bases, products, search]);

  const designUrl = (path: string) =>
    supabase.storage.from(DESIGN_BUCKET).getPublicUrl(path).data.publicUrl;
  const mockupUrl = (path: string) =>
    supabase.storage.from(MOCKUP_BUCKET).getPublicUrl(path).data.publicUrl;

  const design = useMemo(() => designs.find((d) => d.id === selectedDesign) || null, [designs, selectedDesign]);

  function toggleBaseProduct(productId: string) {
    setSelectedBaseProducts((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  }

  const totalSteps = useMemo(() => {
    let n = 0;
    for (const g of baseGroups) if (selectedBaseProducts.has(g.product.id)) n += g.items.length;
    return n;
  }, [baseGroups, selectedBaseProducts]);

  async function generate() {
    if (!design) { toast.error("Izvēlies dizainu"); return; }
    if (selectedBaseProducts.size === 0) { toast.error("Izvēlies vismaz vienu bāzes kreklu"); return; }
    setBusy(true);
    setProgress({ done: 0, total: totalSteps });
    let createdCount = 0;
    let done = 0;
    try {
      const designPublic = designUrl(design.file_path);
      // sanity: ensure design loads
      await urlToImage(designPublic);

      for (const group of baseGroups) {
        if (!selectedBaseProducts.has(group.product.id)) continue;
        const variants: { name: string; hex: string; images: string[] }[] = [];
        const sizeSet = new Set<string>();
        for (const sz of group.product.sizes || []) sizeSet.add(sz);

        for (const b of group.items) {
          try {
            const blob = await composeMockup({
              mockupUrl: mockupUrl(b.mockup_path),
              designUrl: designPublic,
              printArea: b.print_area,
              maxWidth: 1400,
            });
            const path = `${design.id}/${group.product.id}/${b.id}.jpg`;
            const up = await supabase.storage.from(OUT_BUCKET).upload(path, blob, {
              contentType: "image/jpeg", upsert: true,
            });
            if (up.error) throw up.error;
            const publicUrl = supabase.storage.from(OUT_BUCKET).getPublicUrl(path).data.publicUrl;
            variants.push({
              name: b.color_name,
              hex: b.color_hex || "#888888",
              images: [publicUrl],
            });
          } catch (e) {
            console.error("Mockup failed", b.id, e);
            toast.error(`${group.product.name} (${b.color_name}): mockup neizdevās`);
          }
          done++; setProgress({ done, total: totalSteps });
        }

        if (variants.length === 0) continue;

        const baseName = group.product.name_lv || group.product.name;
        const draftName = `[DRAFT] ${design.name} — ${baseName}`;
        const slug = `${slugify(design.name)}-${slugify(baseName)}-${Date.now().toString(36)}`;
        const payload: any = {
          name: draftName,
          name_lv: draftName,
          name_en: null,
          slug,
          description: group.product.description ?? null,
          description_lv: group.product.description_lv ?? group.product.description ?? null,
          description_en: null,
          price: 0,
          category: group.product.category,
          sizes: group.product.sizes ?? [],
          colors: variants.map((v) => v.name),
          customizable: false,
          color_variants: variants,
          image_url: variants[0].images[0],
          in_stock: true,
          is_draft: true,
          zakeke_model_code: null,
        };
        const { error } = await supabase.from("products").insert(payload);
        if (error) {
          console.error("Insert product failed", error);
          toast.error(`${baseName}: produkts neizveidojās`);
        } else {
          createdCount++;
        }
      }
      toast.success(`Izveidoti ${createdCount} melnraksta produkti. Pārbaudi tos sadaļā Produkti.`);
      setSelectedBaseProducts(new Set());
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Ģenerēšana neizdevās");
    } finally {
      setBusy(false); setProgress(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
      {/* Design picker */}
      <Card className="border border-border">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base">1. Dizains</h3>
            {design && <Badge variant="secondary" className="ml-auto text-[10px]">{design.name}</Badge>}
          </div>
          {designs.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body">Bibliotēka tukša — augšupielādē dizainus.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[440px] overflow-y-auto pr-1">
              {designs.map((d) => {
                const sel = selectedDesign === d.id;
                return (
                  <button key={d.id} onClick={() => setSelectedDesign(d.id)}
                    className={`relative aspect-square rounded border-2 overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px] ${sel ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"}`}>
                    <img src={designUrl(d.file_path)} alt={d.name} className="w-full h-full object-contain p-1" loading="lazy" />
                    {sel && <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate font-body">{d.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Base picker */}
      <Card className="border border-border">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base">2. Bāzes krekli</h3>
            <Badge variant="secondary" className="ml-auto text-[10px]">{selectedBaseProducts.size} izvēlēti</Badge>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Meklēt bāzi…"
              className="w-full pl-8 pr-2 py-1.5 rounded border border-border bg-card text-sm font-body" />
          </div>

          {baseGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body">Nav pieejamu bāzu. Pievieno tās sadaļā Bāzes krekli.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {baseGroups.map(({ product, items }) => {
                const sel = selectedBaseProducts.has(product.id);
                return (
                  <button key={product.id} onClick={() => toggleBaseProduct(product.id)}
                    className={`w-full text-left rounded border-2 p-2 transition ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${sel ? "bg-primary border-primary" : "border-border"}`}>
                        {sel && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-sm truncate">{product.name_lv || product.name}</div>
                        <div className="text-[10px] text-muted-foreground">{product.category} · {items.length} krāsas · {(product.sizes || []).join("/") || "—"}</div>
                      </div>
                      <div className="flex -space-x-1">
                        {items.slice(0, 6).map((b) => (
                          <div key={b.id} className="w-4 h-4 rounded-full border border-background"
                            style={{ background: b.color_hex || "#888" }} title={b.color_name} />
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
            <Button onClick={generate} disabled={busy || !design || selectedBaseProducts.size === 0}
              className="w-full bg-primary text-primary-foreground">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Izveidot melnrakstus ({totalSteps} mockup)
            </Button>
            <p className="text-[10px] text-muted-foreground font-body text-center">
              Produkti tiks izveidoti kā melnraksti — pielāgo cenu, nosaukumu un kategoriju sadaļā <strong>Produkti</strong> un noņem melnraksta atzīmi, lai publicētu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}