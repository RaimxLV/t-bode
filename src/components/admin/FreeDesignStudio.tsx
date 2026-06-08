import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, ArrowRight, Eraser, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { removeDesignBackground } from "@/lib/removeDesignBackground";
import { DownloadSizeDialog } from "@/components/admin/DownloadSizeDialog";

type StudioItem = {
  id: string;
  name: string;
  file_path: string;
  url: string;
  created_at: string;
};

const SIZES = [
  { value: "square_hd", label: "Kvadrāts (1:1)" },
  { value: "portrait_4_3", label: "Portrets (3:4)" },
  { value: "landscape_4_3", label: "Ainava (4:3)" },
];

const MODELS = [
  { value: "auto", label: "Auto (ieteicams)" },
  { value: "recraft", label: "Recraft — ilustrācijas" },
  { value: "ideogram", label: "Ideogram — teksts" },
  { value: "flux-pro", label: "Flux Pro — foto-reālistiski" },
  { value: "seedream", label: "Seedream — radoši" },
];

export function FreeDesignStudio() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(2);
  const [size, setSize] = useState("square_hd");
  const [model, setModel] = useState("auto");
  const [transparent, setTransparent] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<StudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bgRemovingId, setBgRemovingId] = useState<string | null>(null);
  const [downloadItem, setDownloadItem] = useState<StudioItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("design_library")
        .select("id, name, file_path, created_at, tags")
        .contains("tags", ["studio"])
        .order("created_at", { ascending: false })
        .limit(48);
      const mapped: StudioItem[] = ((data || []) as any[]).map((r) => ({
        id: r.id,
        name: r.name || "AI dizains",
        file_path: r.file_path,
        created_at: r.created_at,
        url: supabase.storage.from("design-library").getPublicUrl(r.file_path).data.publicUrl,
      }));
      setItems(mapped);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleGenerate() {
    if (prompt.trim().length < 3) {
      toast.error("Apraksts pārāk īss");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-free-design", {
        body: {
          prompt: prompt.trim(),
          count,
          image_size: size,
          model,
          transparent_bg: transparent,
        },
      });
      if (error) throw error;
      const ok = (data as any)?.ok ?? 0;
      const failed = (data as any)?.failed ?? 0;
      if (ok) toast.success(`Uzģenerēti ${ok} dizaini`);
      if (failed) {
        const firstErr = (data as any)?.results?.find((r: any) => !r.ok)?.error;
        toast.error(firstErr || `Neizdevās ${failed} dizainiem`);
      }
      await load();
    } catch (e: any) {
      toast.error("Ģenerēšana neizdevās: " + (e?.message ?? String(e)));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRemoveBg(item: StudioItem) {
    setBgRemovingId(item.id);
    try {
      const data = await removeDesignBackground([item.id], true);
      if ((data?.ok ?? 0) > 0) {
        toast.success("Fons noņemts");
        await load();
      } else {
        const firstErr = data?.results?.find((r) => !r.ok)?.error;
        toast.error(firstErr || "Neizdevās noņemt fonu");
      }
    } catch (e: any) {
      toast.error(e?.message || "Fona noņemšana neizdevās");
    } finally {
      setBgRemovingId(null);
    }
  }

  async function handleDelete(item: StudioItem) {
    if (!confirm(`Dzēst "${item.name}"?`)) return;
    await supabase.storage.from("design-library").remove([item.file_path]);
    await supabase.from("design_library").delete().eq("id", item.id);
    toast.success("Dzēsts");
    setItems((prev) => prev.filter((x) => x.id !== item.id));
  }

  function safeFileName(name: string) {
    return (name || "ai-dizains")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ai-dizains";
  }

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Wand2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold mb-1">AI Studija — brīva ģenerēšana</p>
            <p className="text-muted-foreground">
              Uzraksti ko vien gribi (piem. "smieklīgi kaķi astronauta tērpā"), un AI uzģenerēs dizainus.
              Rezultāti automātiski tiek saglabāti dizainu bibliotēkā.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-body">Apraksts</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Piemēram: smieklīgi kaķi ar saulesbrillēm, retro 80-to gadu stilā, spilgtas neona krāsas"
              rows={4}
              className="font-body"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Skaits</Label>
              <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 6, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Izmērs</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Modelis</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs font-body">Caurspīdīgs fons</Label>
              <label className="flex items-center gap-2 h-10 px-3 rounded-md border bg-card cursor-pointer">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-body">{transparent ? "Jā" : "Nē"}</span>
              </label>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || prompt.trim().length < 3}
            className="w-full sm:w-auto"
            size="lg"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? `Ģenerē ${count} dizainus…` : `Ģenerē ${count} ${count === 1 ? "dizainu" : "dizainus"}`}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Pēdējie AI Studio dizaini</h3>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin?tab=designlibrary")} className="gap-1.5">
          Visa bibliotēka <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
            Vēl nav nevienas studio bildes. Uzraksti aprakstu augšā un nospied "Ģenerē".
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden group relative">
              <div className="aspect-square bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                <img src={item.url} alt={item.name} loading="lazy" className="w-full h-full object-contain p-1" />
              </div>
              <div className="p-1.5 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => handleRemoveBg(item)}
                  disabled={bgRemovingId === item.id}
                  title="Noņemt fonu"
                >
                  {bgRemovingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setDownloadItem(item)}
                  title="Lejupielādēt"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 ml-auto text-destructive hover:text-destructive"
                  onClick={() => handleDelete(item)}
                  title="Dzēst"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {downloadItem && (
        <DownloadSizeDialog
          imageUrl={downloadItem.url}
          fileName={safeFileName(downloadItem.name)}
          onClose={() => setDownloadItem(null)}
        />
      )}
    </div>
  );
}