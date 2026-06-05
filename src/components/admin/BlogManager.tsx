import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Eye, Trash2, Send, Save, X, Package, Plus, Calendar, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  status: "draft" | "published" | "scheduled" | "archived";
  campaign_id: string | null;
  published_at: string | null;
  created_at: string;
};

type LinkedProduct = {
  id: string;
  name: string;
  name_lv: string | null;
  image_url: string | null;
  available_from: string | null;
  expires_at: string | null;
  always_available: boolean;
  color_variants: Array<{ name: string; hex: string; images?: string[] }> | null;
  print_offset_y: number | null;
  print_scale: number | null;
  source: "auto" | "manual";
};

export const BlogManager = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [productsTab, setProductsTab] = useState<Post | null>(null);
  const [linked, setLinked] = useState<LinkedProduct[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProducts, setPickerProducts] = useState<any[]>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Neizdevās ielādēt rakstus");
    else setPosts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openProducts = async (p: Post) => {
    setProductsTab(p);
    await loadLinked(p);
  };

  const loadLinked = async (p: Post) => {
    setLinkBusy(true);
    const { data: links } = await supabase
      .from("blog_post_products" as any)
      .select("product_id, source, sort_order")
      .eq("blog_post_id", p.id)
      .order("sort_order");
    const manualIds: string[] = (links || []).map((l: any) => l.product_id);

    let autoIds: string[] = [];
    if (p.campaign_id) {
      const { data: byCampaign } = await supabase
        .from("products")
        .select("id")
        .eq("campaign_id", p.campaign_id);
      autoIds = (byCampaign || []).map((r: any) => r.id).filter((id: string) => !manualIds.includes(id));
    }
    const allIds = [...manualIds, ...autoIds];
    if (allIds.length === 0) { setLinked([]); setLinkBusy(false); return; }
    const { data: prods } = await supabase
      .from("products")
      .select("id,name,name_lv,image_url,available_from,expires_at,always_available,color_variants,print_offset_y,print_scale")
      .in("id", allIds);
    const byId = new Map((prods || []).map((p: any) => [p.id, p]));
    const ordered: LinkedProduct[] = [
      ...manualIds.map((id) => byId.get(id)).filter(Boolean).map((p: any) => ({ ...p, source: "manual" as const })),
      ...autoIds.map((id) => byId.get(id)).filter(Boolean).map((p: any) => ({ ...p, source: "auto" as const })),
    ];
    setLinked(ordered);
    setLinkBusy(false);
  };

  const addLink = async (productId: string) => {
    if (!productsTab) return;
    const { error } = await supabase.from("blog_post_products" as any).insert({
      blog_post_id: productsTab.id, product_id: productId, source: "manual",
    });
    if (error) { toast.error(error.message); return; }
    await loadLinked(productsTab);
  };

  const removeLink = async (productId: string) => {
    if (!productsTab) return;
    await supabase.from("blog_post_products" as any)
      .delete()
      .eq("blog_post_id", productsTab.id)
      .eq("product_id", productId);
    await loadLinked(productsTab);
  };

  const openPicker = async () => {
    if (!productsTab) return;
    setPickerOpen(true);
    setPickerSelected(new Set());
    setPickerLoading(true);
    const linkedIds = new Set(linked.map((l) => l.id));
    // Show DRAFT products (campaign-generated cards waiting for review/link).
    const { data } = await supabase
      .from("products")
      .select("id,name,name_lv,image_url,price,category,holiday_id,is_draft,campaign_id")
      .eq("is_draft", true)
      .order("created_at", { ascending: false })
      .limit(300);
    setPickerProducts((data || []).filter((p: any) => !linkedIds.has(p.id)));
    setPickerLoading(false);
  };

  const confirmPicker = async () => {
    if (!productsTab || pickerSelected.size === 0) { setPickerOpen(false); return; }
    const rows = Array.from(pickerSelected).map((product_id) => ({
      blog_post_id: productsTab.id,
      product_id,
      source: "manual",
    }));
    const { error } = await supabase.from("blog_post_products" as any).insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Pievienoti ${rows.length} produkti`);
    setPickerOpen(false);
    await loadLinked(productsTab);
  };

  const updateAvailability = async (productId: string, patch: Partial<LinkedProduct>) => {
    const payload: any = {};
    if ("available_from" in patch) payload.available_from = patch.available_from;
    if ("expires_at" in patch) payload.expires_at = patch.expires_at;
    if ("always_available" in patch) payload.always_available = patch.always_available;
    const { error } = await supabase.from("products").update(payload).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    setLinked((prev) => prev.map((p) => p.id === productId ? { ...p, ...patch } as any : p));
  };

  const toIsoDate = (s: string | null) => s ? s.slice(0, 10) : "";
  const fromIsoDate = (s: string) => s ? new Date(s).toISOString() : null;

  const publish = async (p: Post) => {
    setBusy(p.id);
    try {
      // 1. Collect all related products (manual links + campaign auto)
      const { data: links } = await supabase
        .from("blog_post_products" as any)
        .select("product_id")
        .eq("blog_post_id", p.id);
      const manualIds: string[] = (links || []).map((l: any) => l.product_id);
      let autoIds: string[] = [];
      let expiresAt: string | null = null;
      if (p.campaign_id) {
        const { data: byCampaign } = await supabase
          .from("products")
          .select("id")
          .eq("campaign_id", p.campaign_id);
        autoIds = (byCampaign || []).map((r: any) => r.id);

        // Compute holiday-based expiry: 1 day before holiday
        const { data: c } = await supabase
          .from("campaigns")
          .select("year, holidays(month, day)")
          .eq("id", p.campaign_id)
          .maybeSingle();
        const h: any = (c as any)?.holidays;
        if (h?.month && h?.day) {
          const year = (c as any).year ?? new Date().getFullYear();
          const holiday = new Date(Date.UTC(year, h.month - 1, h.day, 0, 0, 0));
          const expiry = new Date(holiday.getTime() - 24 * 60 * 60 * 1000);
          expiresAt = expiry.toISOString();
        }
      }

      const allIds = Array.from(new Set([...manualIds, ...autoIds]));

      // 2. Flip products live + flag for collection
      if (allIds.length > 0) {
        const patch: any = {
          is_draft: false,
          status: "published",
          show_in_collection: true,
          available_from: new Date().toISOString(),
        };
        if (expiresAt) patch.expires_at = expiresAt;
        const { error: upErr } = await supabase
          .from("products")
          .update(patch)
          .in("id", allIds);
        if (upErr) throw upErr;
      }

      // 3. Publish blog post
      const { error } = await supabase
        .from("blog_posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) throw error;

      toast.success(`Raksts publicēts un ${allIds.length} produkti redzami kolekcijā`);
      load();
    } catch (e: any) {
      toast.error("Neizdevās publicēt: " + (e.message || e));
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async (p: Post) => {
    setBusy(p.id);
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "draft", published_at: null })
      .eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Atgriezts kā melnraksts"); load(); }
  };

  const remove = async (p: Post) => {
    if (!confirm(`Dzēst rakstu "${p.title}"?`)) return;
    setBusy(p.id);
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Dzēsts"); load(); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(editing.id);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: editing.title,
        slug: editing.slug,
        excerpt: editing.excerpt,
        content: editing.content,
        cover_image_url: editing.cover_image_url,
      })
      .eq("id", editing.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Saglabāts"); setEditing(null); load(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      {posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
          Nav neviena bloga raksta. Tie tiks izveidoti automātiski no Autopilot kampaņām.
        </CardContent></Card>
      ) : (
        posts.map((p) => (
          <Card key={p.id} className="border border-border">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
              {p.cover_image_url && (
                <img src={p.cover_image_url} alt={p.title} className="w-full sm:w-32 h-32 object-cover rounded-md border" loading="lazy" />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-display text-base sm:text-lg flex-1 min-w-0">{p.title}</h3>
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>
                    {p.status === "published" ? "Publicēts" : p.status === "draft" ? "Melnraksts" : p.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">/{p.slug}</p>
                {p.excerpt && <p className="text-xs sm:text-sm text-muted-foreground font-body line-clamp-2">{p.excerpt}</p>}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)} className="gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Rediģēt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openProducts(p)} className="gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Produkti
                  </Button>
                  {p.status === "published" ? (
                    <>
                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"><Eye className="w-3.5 h-3.5" /> Skatīt</a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => unpublish(p)} disabled={busy === p.id}>
                        Noņemt
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => publish(p)} disabled={busy === p.id} className="gap-1.5">
                      {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Publicēt
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(p)} disabled={busy === p.id} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Rediģēt rakstu</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">Virsraksts</label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">Slug</label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">Vāka attēla URL</label>
                  <Input value={editing.cover_image_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} />
                  {editing.cover_image_url && (
                    <img src={editing.cover_image_url} alt="" className="mt-2 max-h-40 rounded border" />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold">Īss apraksts (excerpt)</label>
                  <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">Saturs (HTML)</label>
                  <Textarea rows={14} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="font-mono text-xs" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-1.5" /> Atcelt</Button>
                  <Button onClick={saveEdit} disabled={busy === editing.id}>
                    {busy === editing.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Saglabāt
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!productsTab} onOpenChange={(o) => { if (!o) { setProductsTab(null); setLinked([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {productsTab && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Saistītie produkti — {productsTab.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={openPicker} className="gap-1.5 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Pievienot produktus no galerijas
                </Button>

                {linkBusy ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : linked.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body text-center py-6">
                    Nav saistītu produktu. {productsTab.campaign_id ? "Kampaņas produkti pievienosies automātiski." : ""}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linked.map((p) => (
                      <div key={p.id} className="border border-border rounded p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-body truncate">{p.name_lv || p.name}</div>
                            <Badge variant={p.source === "auto" ? "secondary" : "default"} className="text-[9px] mt-0.5">
                              {p.source === "auto" ? "Auto no kampaņas" : "Manuāls"}
                            </Badge>
                          </div>
                          {p.source === "manual" && (
                            <Button size="sm" variant="ghost" onClick={() => removeLink(p.id)} className="text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <label className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-3 h-3" /> Pieejams no</div>
                            <Input
                              type="date"
                              value={toIsoDate(p.available_from)}
                              disabled={p.always_available}
                              onChange={(e) => updateAvailability(p.id, { available_from: fromIsoDate(e.target.value) })}
                              className="h-8 text-xs"
                            />
                          </label>
                          <label className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-3 h-3" /> Pieejams līdz</div>
                            <Input
                              type="date"
                              value={toIsoDate(p.expires_at)}
                              disabled={p.always_available}
                              onChange={(e) => updateAvailability(p.id, { expires_at: fromIsoDate(e.target.value) })}
                              className="h-8 text-xs"
                            />
                          </label>
                          <label className="flex items-end gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={p.always_available}
                              onChange={(e) => updateAvailability(p.id, { always_available: e.target.checked })}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-xs font-body flex items-center gap-1"><InfinityIcon className="w-3 h-3" /> Vienmēr pieejams</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Visual product picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Izvēlies produktus</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Meklēt…"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            className="mb-3"
          />
          {pickerLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
                {pickerProducts
                  .filter((p) => {
                    const q = pickerSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (p.name_lv || p.name || "").toLowerCase().includes(q);
                  })
                  .map((p) => {
                    const selected = pickerSelected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const next = new Set(pickerSelected);
                          if (selected) next.delete(p.id); else next.add(p.id);
                          setPickerSelected(next);
                        }}
                        className={`relative border-2 rounded-lg overflow-hidden text-left transition-all ${
                          selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/40"
                        }`}
                      >
                        <div className="aspect-square bg-muted">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="w-8 h-8" /></div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-body line-clamp-2 leading-tight">{p.name_lv || p.name}</p>
                          <p className="text-xs font-semibold mt-0.5">{Number(p.price).toFixed(2)} €</p>
                        </div>
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">✓</div>
                        )}
                      </button>
                    );
                  })}
                {pickerProducts.length === 0 && (
                  <p className="col-span-full text-center py-8 text-sm text-muted-foreground font-body">
                    Visi produkti jau pievienoti.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                <Button variant="outline" onClick={() => setPickerOpen(false)}>Atcelt</Button>
                <Button onClick={confirmPicker} disabled={pickerSelected.size === 0}>
                  Pievienot ({pickerSelected.size})
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};