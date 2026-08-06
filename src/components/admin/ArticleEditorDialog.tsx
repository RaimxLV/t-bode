import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { useContentCategories } from "@/hooks/useContentCategories";
import { readingMinutes } from "@/lib/articleContent";

export type EditablePost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq: { q: string; a: string }[] | null;
  scheduled_for: string | null;
  status: string;
};

function slugify(s: string) {
  return (
    s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "raksts"
  );
}

/** Shared editor for Idejas un Padomi articles (content, cover, SEO, FAQ, schedule). */
export const ArticleEditorDialog = ({
  post,
  open,
  onOpenChange,
  onSaved,
}: {
  post: EditablePost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const { data: categories = [] } = useContentCategories();
  const [draft, setDraft] = useState<EditablePost | null>(post);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setDraft(post), [post]);

  if (!draft) return null;

  const faq = Array.isArray(draft.faq) ? draft.faq : [];
  const setFaq = (next: { q: string; a: string }[]) => setDraft({ ...draft, faq: next });

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `blog/${draft.id || "new"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      setDraft({ ...draft, cover_image_url: pub.publicUrl });
      if (draft.id) {
        await supabase.from("blog_posts").update({ cover_image_url: pub.publicUrl }).eq("id", draft.id);
        onSaved();
        toast.success("Attēls saglabāts");
      } else {
        toast.success("Attēls augšupielādēts — spied Saglabāt");
      }
    } catch (e: any) {
      toast.error(e?.message || "Augšupielāde neizdevās");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Nepieciešams virsraksts"); return; }
    setSaving(true);
    const payload: any = {
      title: draft.title.trim(),
      slug: draft.slug || slugify(draft.title),
      excerpt: draft.excerpt,
      content: draft.content,
      cover_image_url: draft.cover_image_url || null,
      category_id: draft.category_id,
      seo_title: draft.seo_title,
      seo_description: draft.seo_description,
      faq: faq.filter((f) => f.q.trim() && f.a.trim()),
      reading_minutes: readingMinutes(draft.content),
      scheduled_for: draft.scheduled_for,
    };
    const { error } = draft.id
      ? await supabase.from("blog_posts").update(payload).eq("id", draft.id)
      : await supabase.from("blog_posts").insert({ ...payload, status: "draft" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saglabāts");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {draft.id ? "Rediģēt rakstu" : "Jauns raksts"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Virsraksts (H1)</label>
              <Input
                value={draft.title}
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value, slug: draft.slug || slugify(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Kategorija</label>
              <Select
                value={draft.category_id ?? ""}
                onValueChange={(v) => setDraft({ ...draft, category_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Izvēlies kategoriju" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_lv}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">URL (slug)</label>
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold">Publicēšanas datums (plānots)</label>
              <Input
                type="datetime-local"
                value={draft.scheduled_for ? draft.scheduled_for.slice(0, 16) : ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">Vāka attēls</label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Input
                placeholder="URL vai augšupielādē…"
                value={draft.cover_image_url ?? ""}
                onChange={(e) => setDraft({ ...draft, cover_image_url: e.target.value })}
              />
              <label
                className={`inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {draft.cover_image_url ? "Nomainīt" : "Augšupielādēt"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadCover(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {draft.cover_image_url && (
              <div className="mt-2 relative inline-block">
                <img src={draft.cover_image_url} alt="" className="max-h-40 rounded border bg-muted" />
                <Button
                  type="button" size="sm" variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80"
                  onClick={() => setDraft({ ...draft, cover_image_url: "" })}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold">Īss apraksts (rāda sarakstā)</label>
            <Textarea rows={2} value={draft.excerpt ?? ""} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </div>

          <div>
            <label className="text-xs font-semibold">Saturs</label>
            <RichTextEditor value={draft.content ?? ""} onChange={(html) => setDraft({ ...draft, content: html })} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Aptuvenais lasīšanas laiks: {readingMinutes(draft.content)} min
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="font-display text-sm uppercase tracking-wider">Google (SEO)</p>
            <div>
              <label className="text-xs font-semibold">SEO virsraksts (līdz 60 zīmēm)</label>
              <Input
                maxLength={70}
                value={draft.seo_title ?? ""}
                onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })}
                placeholder={draft.title}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">SEO apraksts (līdz 155 zīmēm)</label>
              <Textarea
                rows={2}
                maxLength={200}
                value={draft.seo_description ?? ""}
                onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })}
                placeholder={draft.excerpt ?? ""}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm uppercase tracking-wider">Biežāk uzdotie jautājumi</p>
              <Button size="sm" variant="outline" onClick={() => setFaq([...faq, { q: "", a: "" }])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Pievienot
              </Button>
            </div>
            {faq.length === 0 && (
              <p className="text-xs text-muted-foreground font-body">
                FAQ palīdz parādīties Google rezultātos ar izvērstiem jautājumiem.
              </p>
            )}
            {faq.map((f, i) => (
              <div key={i} className="space-y-1.5 border-t border-border pt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Jautājums"
                    value={f.q}
                    onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                  />
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0"
                    onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  placeholder="Atbilde"
                  value={f.a}
                  onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-1.5" /> Atcelt
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Saglabāt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};