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
  source: "auto" | "manual";
};

export const BlogManager = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [productsTab, setProductsTab] = useState<Post | null>(null);
  const [linked, setLinked] = useState<LinkedProduct[]>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);

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
      .select("id,name,name_lv,image_url,available_from,expires_at,always_available")
      .in("id", allIds);
    const byId = new Map((prods || []).map((p: any) => [p.id, p]));
    const ordered: LinkedProduct[] = [
      ...manualIds.map((id) => byId.get(id)).filter(Boolean).map((p: any) => ({ ...p, source: "manual" as const })),
      ...autoIds.map((id) => byId.get(id)).filter(Boolean).map((p: any) => ({ ...p, source: "auto" as const })),
    ];
    setLinked(ordered);
    setLinkBusy(false);
  };

  const searchProducts = async (q: string) => {
    setLinkSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("products")
      .select("id,name,name_lv,image_url")
      .or(`name.ilike.%${q}%,name_lv.ilike.%${q}%`)
      .limit(8);
    setSearchResults(data || []);
  };

  const addLink = async (productId: string) => {
    if (!productsTab) return;
    const { error } = await supabase.from("blog_post_products" as any).insert({
      blog_post_id: productsTab.id, product_id: productId, source: "manual",
    });
    if (error) { toast.error(error.message); return; }
    setLinkSearch(""); setSearchResults([]);
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
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", p.id);
    setBusy(null);
    if (error) toast.error("Neizdevās publicēt: " + error.message);
    else { toast.success("Raksts publicēts"); load(); }
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
    </div>
  );
};