import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, Search, Loader2, Image as ImageIcon, Plus, Printer, Eraser } from "lucide-react";
import { cropTransparentPng, pool } from "@/lib/imageCrop";
import { PrintExportDialog } from "./PrintExportDialog";
import { removeDesignBackground } from "@/lib/removeDesignBackground";

interface DesignCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface DesignItem {
  id: string;
  name: string;
  file_path: string;
  category_id: string | null;
  tags: string[];
  created_at: string;
}

const BUCKET = "design-library";
const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
const UPLOAD_CONCURRENCY = 5;

export function DesignLibrary() {
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [cropPng, setCropPng] = useState(false);
  const [exportDesign, setExportDesign] = useState<DesignItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgRemovingId, setBgRemovingId] = useState<string | null>(null);

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("design_categories").select("*").order("sort_order"),
      supabase.from("design_library").select("*").order("created_at", { ascending: false }),
    ]);
    setCategories((cats as DesignCategory[]) || []);
    setDesigns((items as DesignItem[]) || []);
    setLoading(false);
  }

  function publicUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function isSupportedImageFile(file: File) {
    if (file.type.startsWith("image/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return SUPPORTED_EXTENSIONS.has(ext);
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const defaultCat = filterCat !== "all" ? filterCat : (categories[0]?.id ?? null);
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    let ok = 0; let failed = 0;
    const results = await pool(
      files,
      UPLOAD_CONCURRENCY,
      async (file) => {
        if (!isSupportedImageFile(file)) return false;
        try {
          const toUpload = cropPng ? await cropTransparentPng(file) : file;
          const ext = toUpload.name.split(".").pop()?.toLowerCase() || "png";
          const safeName = toUpload.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
          const path = `${defaultCat ?? "uncat"}/${crypto.randomUUID()}-${safeName}.${ext}`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, toUpload, {
            contentType: toUpload.type || undefined,
            upsert: false,
          });
          if (upErr) throw upErr;
          const { error: dbErr } = await supabase.from("design_library").insert({
            name: safeName || toUpload.name,
            file_path: path,
            category_id: defaultCat,
            file_size: toUpload.size,
            tags: [],
          });
          if (dbErr) throw dbErr;
          return true;
        } catch (e: any) {
          console.error("upload failed", file.name, e);
          return false;
        }
      },
      (done, total) => setUploadProgress({ done, total }),
    );
    ok = results.filter(Boolean).length;
    failed = results.length - ok;
    setUploading(false);
    setUploadProgress(null);
    if (ok) toast.success(`Augšupielādēti ${ok} dizaini`);
    if (failed) toast.error(`Neizdevās augšupielādēt ${failed} failus`);
    await loadAll();
  }

  async function deleteDesign(item: DesignItem) {
    if (!confirm(`Dzēst "${item.name}"?`)) return;
    await supabase.storage.from(BUCKET).remove([item.file_path]);
    await supabase.from("design_library").delete().eq("id", item.id);
    toast.success("Dizains dzēsts");
    setDesigns((d) => d.filter((x) => x.id !== item.id));
    setSelected((s) => { const ns = new Set(s); ns.delete(item.id); return ns; });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Dzēst ${selected.size} dizainus?`)) return;
    const items = designs.filter((d) => selected.has(d.id));
    await supabase.storage.from(BUCKET).remove(items.map((i) => i.file_path));
    await supabase.from("design_library").delete().in("id", items.map((i) => i.id));
    toast.success(`Dzēsti ${items.length} dizaini`);
    setSelected(new Set());
    await loadAll();
  }

  async function bulkMoveCategory(catId: string) {
    if (selected.size === 0) return;
    await supabase.from("design_library").update({ category_id: catId }).in("id", Array.from(selected));
    toast.success("Kategorija mainīta");
    setSelected(new Set());
    await loadAll();
  }

  async function removeBackgrounds(ids: string[], replace = true) {
    if (ids.length === 0) return;
    const isBulk = ids.length > 1;
    if (isBulk && !confirm(`Noņemt fonu ${ids.length} dizainiem? Oriģināli tiks aizstāti ar caurspīdīgu PNG.`)) return;
    setBgRemoving(true);
    if (!isBulk) setBgRemovingId(ids[0]);
    try {
      const data = await removeDesignBackground(ids, replace);
      const ok = data?.ok ?? 0;
      const failed = data?.failed ?? 0;
      if (ok) toast.success(`Fons noņemts ${ok} dizainiem`);
      if (failed) {
        const firstError = data?.results?.find((row) => !row.ok)?.error;
        toast.error(firstError || `Neizdevās ${failed} dizainiem`);
      }
      setSelected(new Set());
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Fona noņemšana neizdevās");
    } finally {
      setBgRemoving(false);
      setBgRemovingId(null);
    }
  }

  async function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("design_categories").insert({ name, slug, sort_order: categories.length + 1 });
    if (error) { toast.error(error.message); return; }
    setNewCatName("");
    await loadAll();
  }

  const filtered = designs.filter((d) => {
    if (filterCat !== "all" && d.category_id !== filterCat) return false;
    if (search.trim() && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((s) => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-primary text-primary-foreground"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Augšupielādēt bildes (bulk)
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void handleFiles(files);
              }}
            />
            {uploadProgress && (
              <span className="text-xs text-muted-foreground font-body">
                {uploadProgress.done} / {uploadProgress.total}
              </span>
            )}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-body cursor-pointer">
              <input type="checkbox" checked={cropPng} onChange={(e) => setCropPng(e.target.checked)} />
              Apgriezt PNG malas
            </label>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Meklēt..."
                className="pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm font-body w-48 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterCat("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all ${
                filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              Visi <span className="opacity-60">({designs.length})</span>
            </button>
            {categories.map((c) => {
              const count = designs.filter((d) => d.category_id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterCat(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all ${
                    filterCat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {c.name} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="Jauna kategorija"
                className="px-2 py-1 rounded-md border border-border bg-card text-xs font-body w-28"
              />
              <button onClick={addCategory} className="p-1 text-primary hover:text-primary/80"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
              <Badge variant="secondary">{selected.size} izvēlēti</Badge>
              <select
                onChange={(e) => { if (e.target.value) { bulkMoveCategory(e.target.value); e.target.value = ""; } }}
                className="px-2 py-1 rounded-md border border-border bg-card text-xs font-body"
                defaultValue=""
              >
                <option value="" disabled>Pārvietot uz kategoriju...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button size="sm" variant="destructive" onClick={bulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Dzēst izvēlētos
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => removeBackgrounds(Array.from(selected), true)}
                disabled={bgRemoving}
              >
                {bgRemoving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Eraser className="w-4 h-4 mr-1" />}
                Noņemt fonu
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Atcelt izvēli</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border border-dashed border-border">
          <CardContent className="p-12 text-center space-y-3">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="font-body text-muted-foreground">
              {designs.length === 0 ? "Bibliotēka ir tukša. Sāc ar bulk augšupielādi." : "Nav rezultātu šajā kategorijā."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {filtered.map((d) => {
            const sel = selected.has(d.id);
            return (
              <div
                key={d.id}
                onClick={() => toggleSelect(d.id)}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px] ${
                  sel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                }`}
              >
                <img
                  src={publicUrl(d.file_path)}
                  alt={d.name}
                  loading="lazy"
                  className="w-full h-full object-contain p-1"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate font-body">{d.name}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDesign(d); }}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                  aria-label="Dzēst"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setExportDesign(d); }}
                  className="absolute top-1 right-7 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-primary transition-all"
                  aria-label="Sagatavot drukai"
                  title="Sagatavot drukai"
                >
                  <Printer className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); void removeBackgrounds([d.id], true); }}
                  disabled={bgRemoving}
                  className="absolute top-1 right-[3.25rem] p-1 rounded bg-black/70 text-white hover:bg-primary transition-all"
                  aria-label="Noņemt fonu"
                  title="Noņemt fonu"
                >
                  {bgRemovingId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eraser className="w-3 h-3" />}
                </button>
                {sel && (
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {exportDesign && (
        <PrintExportDialog
          designName={exportDesign.name}
          designUrl={publicUrl(exportDesign.file_path)}
          onClose={() => setExportDesign(null)}
        />
      )}
    </div>
  );
}