import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Sparkles, Loader2, Image as ImageIcon, Download, Eraser } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageLightbox } from "@/components/ImageLightbox";
import { downloadPrintReadyPng } from "@/lib/printFile";

type DesignItem = {
  key: string;
  id: string;
  source: "library" | "campaign";
  name: string;
  url: string;
  createdAt: string;
  campaignId?: string | null;
};

export function DraftDesignsGallery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DesignItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [bgRemovingKey, setBgRemovingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [{ data: lib }, { data: camp }] = await Promise.all([
        supabase.from("design_library").select("id,name,file_path,created_at").order("created_at", { ascending: false }),
        supabase
          .from("campaign_designs" as any)
          .select("id,prompt,image_url,created_at,product_id,campaign_id")
          .is("product_id", null)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false }),
      ]);

      const out: DesignItem[] = [];

      for (const d of (lib || []) as any[]) {
        const url = supabase.storage.from("design-library").getPublicUrl(d.file_path).data.publicUrl;
        out.push({
          key: `lib:${d.id}`,
          id: d.id,
          source: "library",
          name: d.name || "Dizains",
          url,
          createdAt: d.created_at,
        });
      }

      const campRows = ((camp || []) as any[]) ?? [];
      const rowsWithPaths = campRows.filter((r) => r.image_url && !/^https?:\/\//i.test(r.image_url));
      const paths = rowsWithPaths.map((r) => r.image_url as string);
      const absoluteRows = campRows.filter((r) => r.image_url && /^https?:\/\//i.test(r.image_url));
      const signedMap: Record<string, string> = {};
      if (paths.length) {
        await supabase.auth.refreshSession();
        const { data: signed } = await supabase.storage
          .from("campaign-assets")
          .createSignedUrls(paths, 60 * 60);
        (signed || []).forEach((s, i) => {
          if (s.signedUrl) signedMap[paths[i]] = s.signedUrl;
        });
      }
      absoluteRows.forEach((r) => {
        signedMap[r.image_url] = r.image_url;
      });
      for (const r of campRows) {
        const url = signedMap[r.image_url];
        if (!url) continue;
        out.push({
          key: `camp:${r.id}`,
          id: r.id,
          source: "campaign",
          name: (r.prompt || "AI dizains").slice(0, 60),
          url,
          createdAt: r.created_at,
          campaignId: r.campaign_id ?? null,
        });
      }

      out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setItems(out);
    } catch (e: any) {
      console.error(e);
      toast.error("Neizdevās ielādēt dizainus");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(item: DesignItem) {
    if (!confirm(`Dzēst dizainu "${item.name}"?`)) return;
    try {
      if (item.source === "library") {
        const { data: row } = await supabase
          .from("design_library")
          .select("file_path,thumbnail_path")
          .eq("id", item.id)
          .maybeSingle();
        if (row?.file_path) {
          await supabase.storage.from("design-library").remove([row.file_path]);
        }
        if ((row as any)?.thumbnail_path) {
          await supabase.storage.from("design-library").remove([(row as any).thumbnail_path]);
        }
        await supabase.from("design_library").delete().eq("id", item.id);
      } else {
        await supabase.from("campaign_designs" as any).delete().eq("id", item.id);
      }
      toast.success("Dizains dzēsts");
      setItems((prev) => prev.filter((i) => i.key !== item.key));
    } catch (e: any) {
      toast.error("Neizdevās dzēst: " + (e?.message ?? String(e)));
    }
  }

  async function handleDownload(item: DesignItem) {
    setDownloadingKey(item.key);
    try {
      const safe = (item.name || "drukas-fails")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "drukas-fails";
      await downloadPrintReadyPng({
        imageUrl: item.url,
        fileName: `${safe}-print.png`,
      });
      toast.success("Drukas fails lejupielādēts (oriģinālā kvalitāte, PNG/SVG bez balta fona)");
    } catch (e: any) {
      toast.error(e?.message || "Neizdevās sagatavot drukas failu");
    } finally {
      setDownloadingKey(null);
    }
  }

  async function handleRemoveBg(item: DesignItem) {
    if (item.source !== "library") {
      toast.error("Fona noņemšana pieejama tikai bibliotēkas dizainiem. Vispirms saglabā kampaņas dizainu bibliotēkā.");
      return;
    }
    if (!confirm(`Noņemt fonu "${item.name}"? Oriģināls tiks aizstāts ar caurspīdīgu PNG.`)) return;
    setBgRemovingKey(item.key);
    try {
      const { data, error } = await supabase.functions.invoke("remove-design-background", {
        body: { design_ids: [item.id], replace: true },
      });
      if (error) throw error;
      const ok = (data as any)?.ok ?? 0;
      if (ok) toast.success("Fons noņemts");
      else toast.error("Neizdevās noņemt fonu");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Fona noņemšana neizdevās");
    } finally {
      setBgRemovingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
          Nav saglabātu dizainu. Tie automātiski parādās šeit no Autopilot kampaņām vai augšupielādētiem failiem dizainu bibliotēkā.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground font-body">
          {items.length} saglabāti dizaini
        </p>
        <Button
          size="sm"
          onClick={() => navigate("/admin?tab=designstoproducts")}
          className="gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Pārvērst par produktiem
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item, idx) => (
          <Card key={item.key} className="overflow-hidden group relative">
            <button
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="aspect-square bg-muted/30 flex items-center justify-center relative w-full cursor-zoom-in"
              aria-label={`Apskatīt ${item.name} pilnā izmērā`}
            >
              <img
                src={item.url}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <Badge
                variant="secondary"
                className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0"
              >
                {item.source === "library" ? "Bibliotēka" : "Kampaņa"}
              </Badge>
            </button>
            <CardContent className="p-2 space-y-1.5">
              <p className="text-xs font-body line-clamp-2 min-h-[2rem]">{item.name}</p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[11px] gap-1 min-w-0"
                  onClick={() => navigate("/admin?tab=designstoproducts")}
                >
                  <Sparkles className="w-3 h-3" /> Publicēt
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => handleDownload(item)}
                  disabled={downloadingKey === item.key}
                  title="Lejuplādēt oriģinālo print failu PNG/SVG formātā ar caurspīdīgu fonu"
                >
                  {downloadingKey === item.key
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                </Button>
                {item.source === "library" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRemoveBg(item)}
                    disabled={bgRemovingKey === item.key}
                    title="Noņemt fonu (caurspīdīgs PNG)"
                  >
                    {bgRemovingKey === item.key
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Eraser className="w-3.5 h-3.5" />}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {lightboxIndex !== null && (
        <ImageLightbox
          images={items.map((i) => i.url)}
          initialIndex={lightboxIndex}
          open={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          alt="Dizains"
        />
      )}
    </>
  );
}