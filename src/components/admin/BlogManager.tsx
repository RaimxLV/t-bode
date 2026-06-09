import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Eye, Trash2, Send, Save, X, Plus, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "raksts";
}

export const BlogManager = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [tab, setTab] = useState<"manual" | "archive">("manual");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts").select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Neizdevās ielādēt rakstus");
    else setPosts((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createNew = () => {
    setEditing({
      id: "",
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      cover_image_url: "",
      status: "draft",
      campaign_id: null,
      published_at: null,
      created_at: new Date().toISOString(),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const payload: any = {
      title: editing.title,
      slug: editing.slug || slugify(editing.title),
      excerpt: editing.excerpt,
      content: editing.content,
      cover_image_url: editing.cover_image_url,
    };
    setBusy(editing.id || "new");
    if (!editing.id) {
      const { error } = await supabase.from("blog_posts").insert({ ...payload, status: "draft" });
      setBusy(null);
      if (error) { toast.error(error.message); return; }
      toast.success("Izveidots"); setEditing(null); load(); return;
    }
    const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Saglabāts"); setEditing(null); load(); }
  };

  const uploadCover = async (file: File) => {
    if (!editing) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `blog/${editing.id || "new"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      setEditing({ ...editing, cover_image_url: newUrl });
      // If the post already exists, persist the cover immediately so users
      // don't lose the upload if they close the dialog without pressing Save.
      if (editing.id) {
        const { error: updErr } = await supabase
          .from("blog_posts")
          .update({ cover_image_url: newUrl })
          .eq("id", editing.id);
        if (updErr) throw updErr;
        await load();
        toast.success("Vāka attēls nomainīts un saglabāts");
      } else {
        toast.success("Vāka attēls augšupielādēts — spied Saglabāt");
      }
    } catch (e: any) {
      toast.error(e?.message || "Augšupielāde neizdevās");
    } finally {
      setUploadingCover(false);
    }
  };

  const publish = async (p: Post) => {
    setBusy(p.id);
    const { error } = await supabase.from("blog_posts").update({
      status: "published", published_at: new Date().toISOString(),
    }).eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Publicēts"); load(); }
  };

  const unpublish = async (p: Post) => {
    setBusy(p.id);
    const { error } = await supabase.from("blog_posts").update({ status: "draft", published_at: null }).eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Atgriezts kā melnraksts"); load(); }
  };

  const remove = async (p: Post) => {
    setBusy(p.id);
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Dzēsts");
      setDeleteTarget(null);
      load();
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const manualPosts = posts.filter((p) => !p.campaign_id);
  const archivePosts = posts.filter((p) => p.status === "published" && !p.campaign_id);

  const renderList = (items: Post[], emptyMsg: string) => items.length === 0 ? (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground font-body">{emptyMsg}</CardContent></Card>
  ) : (
    <div className="space-y-3">
      {items.map((p) => (
        <Card key={p.id} className="border border-border">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
            {p.cover_image_url && (
              <img src={p.cover_image_url} alt={p.title} className="w-full sm:w-32 h-32 object-cover rounded-md border" loading="lazy" />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="font-display text-base sm:text-lg flex-1 min-w-0">{p.title}</h3>
                {p.campaign_id && <Badge variant="outline" className="text-[10px]"><Sparkles className="w-3 h-3 mr-1" />Kampaņa</Badge>}
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
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <a href={`/blog/${p.slug}${p.status !== "published" ? "?preview=1" : ""}`} target="_blank" rel="noreferrer">
                    <Eye className="w-3.5 h-3.5" /> {p.status === "published" ? "Skatīt" : "Priekšskatīt"}
                  </a>
                </Button>
                {!p.campaign_id && (
                  p.status === "published" ? (
                    <Button size="sm" variant="ghost" onClick={() => unpublish(p)} disabled={busy === p.id}>Noņemt</Button>
                  ) : (
                    <Button size="sm" onClick={() => publish(p)} disabled={busy === p.id} className="gap-1.5">
                      {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Publicēt
                    </Button>
                  )
                )}
                {!p.campaign_id && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)} disabled={busy === p.id} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="p-3 text-xs sm:text-sm text-muted-foreground font-body">
          <strong>Svētku iedvesmas</strong> sadaļā rediģē tikai manuāli veidotos rakstus. Autopilot kampaņu raksti tiek rediģēti pašā <strong>Autopilot</strong> vedņa 3. solī, kur tagad ir arī vāka attēla maiņa.
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={createNew} className="gap-1.5"><Plus className="w-4 h-4" /> Jauns raksts</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="manual">Manuālie ({manualPosts.length})</TabsTrigger>
          <TabsTrigger value="archive">Publicēto arhīvs ({archivePosts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="manual">
          {renderList(manualPosts, "Nav neviena manuāla raksta. Spied 'Jauns raksts' lai izveidotu.")}
        </TabsContent>
        <TabsContent value="archive">
          {renderList(archivePosts, "Vēl nav publicētu rakstu.")}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{editing.id ? "Rediģēt iedvesmas rakstu" : "Jauns iedvesmas raksts"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">Virsraksts</label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">Slug</label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">Vāka attēls</label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Input
                      placeholder="URL vai augšupielādē..."
                      value={editing.cover_image_url ?? ""}
                      onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })}
                    />
                    <label
                      className={`inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer ${uploadingCover ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {editing.cover_image_url ? "Nomainīt" : "Augšupielādēt"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingCover}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadCover(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {editing.cover_image_url && (
                    <div className="mt-2 relative inline-block">
                      <img src={editing.cover_image_url} alt="" className="max-h-40 rounded border bg-muted" />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80"
                        onClick={() => setEditing({ ...editing, cover_image_url: "" })}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold">Īss apraksts</label>
                  <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">Saturs</label>
                  <RichTextEditor value={editing.content ?? ""} onChange={(html) => setEditing({ ...editing, content: html })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-1.5" /> Atcelt</Button>
                  <Button onClick={saveEdit} disabled={busy === (editing.id || "new")}>
                    {busy === (editing.id || "new") ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Saglabāt
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !busy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dzēst bloga rakstu?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Raksts "${deleteTarget.title}" tiks neatgriezeniski dzēsts.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === deleteTarget?.id}>Atcelt</AlertDialogCancel>
            <AlertDialogAction disabled={busy === deleteTarget?.id} onClick={(e) => {
              e.preventDefault();
              if (deleteTarget) void remove(deleteTarget);
            }}>
              {busy === deleteTarget?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dzēst"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};