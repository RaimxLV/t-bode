import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles, AlertCircle, CheckCircle2, Loader2, Eye, RefreshCw, Image as ImageIcon, Wand2, Star, Package, FileText, ExternalLink, Shirt, Check } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { composeMockup } from "@/lib/imageCrop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Holiday = {
  id: string;
  name_lv: string;
  name_en: string;
  month: number;
  day: number;
  prompt_theme: string;
  lead_days: number;
  is_active: boolean;
};

type Campaign = {
  id: string;
  holiday_id: string;
  year: number;
  status: "draft" | "generating" | "ready_for_review" | "generating_designs" | "designs_ready" | "products_ready" | "blog_ready" | "ready" | "active" | "completed" | "published" | "archived" | "failed" | "planned";
  title: string | null;
  description: string | null;
  brief: Brief | null;
};

type Brief = {
  title_lv?: string;
  tagline_lv?: string;
  description_lv?: string;
  target_audience?: string;
  color_palette?: string[];
  design_ideas?: { title: string; prompt: string }[];
  product_types?: string[];
};

type DesignRow = {
  id: string;
  campaign_id: string;
  image_url: string | null;
  prompt: string;
  generation_error: string | null;
  is_primary: boolean;
  product_id: string | null;
};

type BaseRow = {
  id: string;
  product_id: string | null;
  name: string;
  color_name: string;
  color_hex: string | null;
  mockup_path: string;
  print_area: { x: number; y: number; w: number; h: number };
  is_active: boolean;
};

type BaseProductInfo = {
  id: string;
  name: string;
  name_lv: string | null;
  category: string;
  sizes: string[] | null;
  description: string | null;
  description_lv: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "produkts";
}

const MONTHS_LV = ["Janv.", "Febr.", "Marts", "Apr.", "Maijs", "Jūn.", "Jūl.", "Aug.", "Sept.", "Okt.", "Nov.", "Dec."];

function nextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const year = now.getFullYear();
  const thisYear = new Date(year, month - 1, day);
  return thisYear < now ? new Date(year + 1, month - 1, day) : thisYear;
}

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const AutopilotDashboard = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Campaign | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [generatingDesigns, setGeneratingDesigns] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [bloggingId, setBloggingId] = useState<string | null>(null);
  const [togglingDesign, setTogglingDesign] = useState<string | null>(null);
  const [bases, setBases] = useState<BaseRow[]>([]);
  const [baseInfos, setBaseInfos] = useState<BaseProductInfo[]>([]);
  const [selectedBases, setSelectedBases] = useState<Record<string, Set<string>>>({});
  const [useAiMockup, setUseAiMockup] = useState<Record<string, boolean>>({});
  const [publishProgress, setPublishProgress] = useState<{ done: number; total: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const [hRes, cRes, dRes, bRes, bpRes] = await Promise.all([
      supabase.from("holidays" as any).select("*").eq("is_active", true).order("month").order("day"),
      supabase.from("campaigns" as any).select("id, holiday_id, year, status, title, description, brief"),
      supabase.from("campaign_designs" as any).select("id, campaign_id, image_url, prompt, generation_error, is_primary, product_id"),
      supabase.from("base_products").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("products").select("id,name,name_lv,category,sizes,description,description_lv"),
    ]);
    if (hRes.error) toast.error("Neizdevās ielādēt svētkus");
    else setHolidays((hRes.data as any) || []);
    if (cRes.error) toast.error("Neizdevās ielādēt kampaņas");
    else setCampaigns((cRes.data as any) || []);
    if (!dRes.error) {
      const rows = (dRes.data as any as DesignRow[]) || [];
      setDesigns(rows);
      // Sign URLs for any with image_url
      const paths = rows.filter((r) => r.image_url).map((r) => r.image_url as string);
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("campaign-assets")
          .createSignedUrls(paths, 60 * 60);
        const map: Record<string, string> = {};
        (signed || []).forEach((s, i) => {
          if (s.signedUrl) map[paths[i]] = s.signedUrl;
        });
        setSignedUrls(map);
      }
    }
    if (!bRes.error) {
      setBases(((bRes.data as any[]) || []).map((x) => ({
        ...x,
        print_area: x.print_area ?? { x: 0.3, y: 0.25, w: 0.4, h: 0.45 },
      })));
    }
    if (!bpRes.error) setBaseInfos((bpRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStart = async (holiday: Holiday) => {
    const next = nextOccurrence(holiday.month, holiday.day);
    const year = next.getFullYear();
    setStarting(holiday.id);
    try {
      const placeholder = `${holiday.name_lv} ${year}`;
      const { data: insertedRaw, error } = await supabase.from("campaigns" as any).insert({
        holiday_id: holiday.id,
        year,
        status: "generating",
        title: placeholder,
      }).select("id").maybeSingle();
      if (error) throw error;
      const inserted = insertedRaw as unknown as { id: string } | null;
      toast.success(`Kampaņa "${placeholder}" izveidota. AI ģenerē brief'u…`);
      await load();
      if (inserted?.id) {
        await runBriefGeneration(inserted.id);
      }
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        toast.error("Šai svētku kampaņai jau ir izveidots ieraksts šim gadam");
      } else {
        toast.error("Neizdevās izveidot kampaņu: " + e.message);
      }
    } finally {
      setStarting(null);
    }
  };

  const runBriefGeneration = async (campaignId: string) => {
    setRegenerating(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-brief", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("AI brief sagatavots!");
      await load();
    } catch (e: any) {
      toast.error("Brief ģenerēšana neizdevās: " + (e.message ?? "nezināma kļūda"));
      await load();
    } finally {
      setRegenerating(null);
    }
  };

  const runDesignGeneration = async (campaignId: string) => {
    setGeneratingDesigns(campaignId);
    toast.info("AI ģenerē dizainus… tas var aizņemt 1–2 minūtes");
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-designs", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const results = (data as any)?.results ?? [];
      const okCount = results.filter((r: any) => r.ok).length;
      toast.success(`Izveidoti ${okCount}/${results.length} dizaini`);
      await load();
    } catch (e: any) {
      toast.error("Dizainu ģenerēšana neizdevās: " + (e.message ?? "nezināma kļūda"));
      await load();
    } finally {
      setGeneratingDesigns(null);
    }
  };

  const toggleDesignApproval = async (design: DesignRow) => {
    setTogglingDesign(design.id);
    try {
      const { error } = await supabase
        .from("campaign_designs" as any)
        .update({ is_primary: !design.is_primary })
        .eq("id", design.id);
      if (error) throw error;
      setDesigns((prev) =>
        prev.map((d) => (d.id === design.id ? { ...d, is_primary: !d.is_primary } : d)),
      );
    } catch (e: any) {
      toast.error("Neizdevās: " + e.message);
    } finally {
      setTogglingDesign(null);
    }
  };

  const toggleBaseFor = (campaignId: string, productId: string) => {
    setSelectedBases((prev) => {
      const cur = new Set(prev[campaignId] ?? []);
      cur.has(productId) ? cur.delete(productId) : cur.add(productId);
      return { ...prev, [campaignId]: cur };
    });
  };

  const basesByProduct = (() => {
    const m = new Map<string, BaseRow[]>();
    for (const b of bases) {
      if (!b.product_id) continue;
      const arr = m.get(b.product_id) ?? [];
      arr.push(b); m.set(b.product_id, arr);
    }
    return m;
  })();

  const availableBaseProducts = baseInfos.filter((p) => basesByProduct.has(p.id));

  const runPublishProducts = async (campaign: Campaign) => {
    const campaignId = campaign.id;
    const starred = designs.filter(
      (d) => d.campaign_id === campaignId && d.is_primary && d.image_url && !d.product_id,
    );
    if (!starred.length) { toast.error("Atzīmē vismaz vienu ★ dizainu"); return; }
    const selectedSet = selectedBases[campaignId] ?? new Set<string>();
    const selectedProducts = availableBaseProducts.filter((p) => selectedSet.has(p.id));
    if (!selectedProducts.length) { toast.error("Izvēlies vismaz vienu bāzes kreklu"); return; }

    setPublishing(campaignId);
    const totalSteps = starred.length * selectedProducts.reduce(
      (sum, p) => sum + (basesByProduct.get(p.id)?.length ?? 0), 0,
    );
    setPublishProgress({ done: 0, total: totalSteps });
    let done = 0;
    let createdCount = 0;
    const brief: any = campaign.brief ?? {};
    const baseTitle = brief.title_lv ?? campaign.title ?? "Kampaņas produkts";

    try {
      for (let di = 0; di < starred.length; di++) {
        const design = starred[di];
        const designSignedUrl = signedUrls[design.image_url!];
        if (!designSignedUrl) {
          toast.error(`Dizainam ${di + 1} nav pieejams URL`);
          continue;
        }

        for (const baseProduct of selectedProducts) {
          const items = basesByProduct.get(baseProduct.id) ?? [];
          const variants: { name: string; hex: string; images: string[] }[] = [];

          for (const b of items) {
            try {
              const mockupPublic = supabase.storage.from("mockup-templates").getPublicUrl(b.mockup_path).data.publicUrl;
              const blob = await composeMockup({
                mockupUrl: mockupPublic,
                designUrl: designSignedUrl,
                printArea: b.print_area,
                maxWidth: 1400,
              });
              const path = `campaigns/${campaignId}/${design.id}/${baseProduct.id}/${b.id}.jpg`;
              const up = await supabase.storage.from("generated-mockups").upload(path, blob, {
                contentType: "image/jpeg", upsert: true,
              });
              if (up.error) throw up.error;
              const publicUrl = supabase.storage.from("generated-mockups").getPublicUrl(path).data.publicUrl;
              variants.push({
                name: b.color_name,
                hex: b.color_hex || "#888888",
                images: [publicUrl],
              });
            } catch (e: any) {
              console.error("Mockup failed", b.id, e);
              toast.error(`${baseProduct.name} (${b.color_name}): mockup neizdevās`);
            }
            done++; setPublishProgress({ done, total: totalSteps });
          }

          if (variants.length === 0) continue;

          const baseName = baseProduct.name_lv || baseProduct.name;
          const productName = starred.length > 1
            ? `${baseTitle} — ${baseName} #${di + 1}`
            : `${baseTitle} — ${baseName}`;
          const slug = `${slugify(baseTitle)}-${slugify(baseName)}-${campaign.year}-${di + 1}-${Date.now().toString(36)}`;

          const payload: any = {
            name: productName,
            name_lv: productName,
            name_en: null,
            slug,
            description: baseProduct.description ?? brief.description_lv ?? null,
            description_lv: baseProduct.description_lv ?? brief.description_lv ?? null,
            description_en: null,
            price: 24.99,
            category: baseProduct.category,
            sizes: baseProduct.sizes ?? ["S", "M", "L", "XL"],
            colors: variants.map((v) => v.name),
            customizable: false,
            color_variants: variants,
            image_url: variants[0].images[0],
            in_stock: true,
            is_draft: true,
            status: "draft",
            holiday_id: (campaign as any).holiday_id,
          };

          const { data: product, error } = await supabase
            .from("products")
            .insert(payload)
            .select("id")
            .maybeSingle();

          if (error || !product) {
            console.error("Insert product failed", error);
            toast.error(`${baseName}: produkts neizveidojās`);
          } else {
            createdCount++;
            // Link first base product back to the design (one design can spawn many products,
            // we just mark the design as "used")
            if (!design.product_id) {
              await supabase
                .from("campaign_designs" as any)
                .update({ product_id: (product as any).id })
                .eq("id", design.id);
            }
          }
        }
      }

      if (createdCount > 0) {
        await supabase.from("campaigns" as any).update({ status: "products_ready" }).eq("id", campaignId);
      }
      toast.success(`Izveidoti ${createdCount} melnraksta produkti ar mockup`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("Publicēšana neizdevās: " + (e?.message ?? "nezināma kļūda"));
    } finally {
      setPublishing(null);
      setPublishProgress(null);
    }
  };

  const runBlogGeneration = async (campaignId: string) => {
    setBloggingId(campaignId);
    toast.info("AI raksta blog ierakstu…");
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-blog", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Blog raksts gatavs! (melnraksts)");
      await load();
    } catch (e: any) {
      toast.error("Blog ģenerēšana neizdevās: " + (e.message ?? "nezināma kļūda"));
    } finally {
      setBloggingId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const sorted = [...holidays].sort((a, b) => {
    return nextOccurrence(a.month, a.day).getTime() - nextOccurrence(b.month, b.day).getTime();
  });

  const campaignFor = (holidayId: string, year: number) =>
    campaigns.find((c) => c.holiday_id === holidayId && c.year === year);

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-amber-500/40 bg-amber-50/30 dark:bg-amber-900/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold mb-1">Autopilot — svētku kampaņas (beta)</p>
            <p className="text-muted-foreground">
              Šeit redzi gaidāmos Latvijas svētkus. Kad svētki ir tuvāk par norādīto dienu skaitu, vari sākt kampaņu — sistēma izveido kampaņas melnrakstu. AI dizainu ģenerēšana (fal.ai), mockup veidošana un blog raksti tiks pievienoti nākamajā solī. <strong>Visi jaunie produkti un bloga raksti sākotnēji ir paslēpti no veikala apmeklētājiem.</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((h) => {
          const next = nextOccurrence(h.month, h.day);
          const days = daysUntil(next);
          const isReady = days <= h.lead_days;
          const camp = campaignFor(h.id, next.getFullYear());

          return (
            <Card key={h.id} className={`border transition-colors ${isReady ? "border-primary/40" : "border-border"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="font-display text-lg truncate">{h.name_lv}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      {h.day}. {MONTHS_LV[h.month - 1]} {next.getFullYear()} — <strong>{days} dienas</strong>
                    </p>
                  </div>
                  {camp ? (
                    <Badge variant="secondary" className="shrink-0">
                      {camp.status === "ready_for_review" && <><CheckCircle2 className="w-3 h-3 mr-1" />Brief gatavs</>}
                      {camp.status === "generating" && <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Ģenerē brief'u</>}
                      {camp.status === "generating_designs" && <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Ģenerē dizainus</>}
                      {camp.status === "designs_ready" && <><ImageIcon className="w-3 h-3 mr-1" />Dizaini gatavi</>}
                      {camp.status === "products_ready" && <><Package className="w-3 h-3 mr-1" />Produkti gatavi</>}
                      {camp.status === "blog_ready" && <><FileText className="w-3 h-3 mr-1" />Blogs gatavs</>}
                      {camp.status === "published" && "Publicēta"}
                      {camp.status === "failed" && "Kļūda"}
                      {camp.status === "archived" && "Arhivēta"}
                      {camp.status === "draft" && "Melnraksts"}
                    </Badge>
                  ) : isReady ? (
                    <Badge className="shrink-0 bg-primary text-primary-foreground">
                      <Sparkles className="w-3 h-3 mr-1" />Gatava kampaņai
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-muted-foreground">Gaida</Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground font-body line-clamp-2">{h.prompt_theme}</p>

                {camp?.brief?.tagline_lv && (
                  <p className="text-sm font-body italic text-foreground/80 line-clamp-2 border-l-2 border-primary/40 pl-2">
                    "{camp.brief.tagline_lv}"
                  </p>
                )}

                {!camp && (
                  <Button
                    size="sm"
                    variant={isReady ? "default" : "outline"}
                    disabled={!isReady || starting === h.id}
                    onClick={() => handleStart(h)}
                    className="w-full"
                  >
                    {starting === h.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Veido...</> : "Sākt kampaņu"}
                  </Button>
                )}

                {camp && (camp.status === "ready_for_review" || camp.status === "failed") && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewing(camp)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Skatīt brief
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={regenerating === camp.id}
                      onClick={() => runBriefGeneration(camp.id)}
                      title="Ģenerēt no jauna"
                    >
                      {regenerating === camp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                {camp && camp.status === "ready_for_review" && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={generatingDesigns === camp.id}
                    onClick={() => runDesignGeneration(camp.id)}
                  >
                    {generatingDesigns === camp.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ģenerē dizainus…</>
                    ) : (
                      <><Wand2 className="w-4 h-4 mr-2" />Ģenerēt dizainus</>
                    )}
                  </Button>
                )}

                {camp && (camp.status === "designs_ready" || camp.status === "generating_designs" || camp.status === "products_ready" || camp.status === "blog_ready") && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {designs.filter((d) => d.campaign_id === camp.id).map((d) => (
                        <div key={d.id} className="relative group aspect-square rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
                          {d.image_url && signedUrls[d.image_url] ? (
                            <>
                              <img src={signedUrls[d.image_url]} alt={d.prompt.slice(0, 40)} className="w-full h-full object-cover" />
                              {camp.status === "designs_ready" && (
                                <button
                                  type="button"
                                  disabled={togglingDesign === d.id}
                                  onClick={() => toggleDesignApproval(d)}
                                  className={`absolute top-1 right-1 p-1 rounded-full transition-colors ${
                                    d.is_primary
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background"
                                  }`}
                                  title={d.is_primary ? "Noņemt apstiprinājumu" : "Apstiprināt šo dizainu"}
                                >
                                  <Star className={`w-3.5 h-3.5 ${d.is_primary ? "fill-current" : ""}`} />
                                </button>
                              )}
                              {d.product_id && (
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] flex items-center gap-1">
                                  <Package className="w-2.5 h-2.5" /> produkts
                                </div>
                              )}
                            </>
                          ) : d.generation_error ? (
                            <div className="p-2 text-[10px] text-destructive text-center">⚠ {d.generation_error}</div>
                          ) : (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                    {camp.status === "designs_ready" && (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          Atzīmē ★ vienu vai vairākus dizainus, kurus pārvērst par produktiem.
                        </p>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={
                            publishing === camp.id ||
                            !designs.some((d) => d.campaign_id === camp.id && d.is_primary && d.image_url)
                          }
                          onClick={() => runPublishProducts(camp.id)}
                        >
                          {publishing === camp.id ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publicē produktus…</>
                          ) : (
                            <><Package className="w-4 h-4 mr-2" />Publicēt produktus (melnraksti)</>
                          )}
                        </Button>
                      </>
                    )}
                    {(camp.status === "products_ready" || camp.status === "blog_ready") && (
                      <Button
                        size="sm"
                        className="w-full"
                        variant={camp.status === "blog_ready" ? "outline" : "default"}
                        disabled={bloggingId === camp.id}
                        onClick={() => runBlogGeneration(camp.id)}
                      >
                        {bloggingId === camp.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Raksta blogu…</>
                        ) : camp.status === "blog_ready" ? (
                          <><RefreshCw className="w-4 h-4 mr-2" />Pārģenerēt blog rakstu</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-2" />Ģenerēt blog rakstu</>
                        )}
                      </Button>
                    )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewing(camp)}>
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> Brief
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={generatingDesigns === camp.id}
                          onClick={() => runDesignGeneration(camp.id)}
                          title="Ģenerēt dizainus no jauna"
                        >
                          {generatingDesigns === camp.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                  </>
                )}

                {camp && camp.status === "generating" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    AI strādā pie kampaņas brief'a…
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {viewing.brief?.title_lv ?? viewing.title ?? "Kampaņa"}
                </DialogTitle>
                {viewing.brief?.tagline_lv && (
                  <DialogDescription className="italic text-base">
                    "{viewing.brief.tagline_lv}"
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-5 font-body text-sm">
                {viewing.brief?.description_lv && (
                  <section>
                    <h4 className="font-semibold mb-1 text-foreground">Apraksts</h4>
                    <p className="text-muted-foreground">{viewing.brief.description_lv}</p>
                  </section>
                )}

                {viewing.brief?.target_audience && (
                  <section>
                    <h4 className="font-semibold mb-1 text-foreground">Mērķauditorija</h4>
                    <p className="text-muted-foreground">{viewing.brief.target_audience}</p>
                  </section>
                )}

                {viewing.brief?.color_palette && viewing.brief.color_palette.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-2 text-foreground">Krāsu palete</h4>
                    <div className="flex gap-2">
                      {viewing.brief.color_palette.map((c) => (
                        <div key={c} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-12 rounded-md border" style={{ backgroundColor: c }} />
                          <span className="text-[10px] text-muted-foreground font-mono">{c}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {viewing.brief?.product_types && viewing.brief.product_types.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-2 text-foreground">Produktu veidi</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewing.brief.product_types.map((p) => (
                        <Badge key={p} variant="outline">{p}</Badge>
                      ))}
                    </div>
                  </section>
                )}

                {viewing.brief?.design_ideas && viewing.brief.design_ideas.length > 0 && (
                  <section>
                    <h4 className="font-semibold mb-2 text-foreground">Dizainu idejas ({viewing.brief.design_ideas.length})</h4>
                    <div className="space-y-3">
                      {viewing.brief.design_ideas.map((d, i) => (
                        <div key={i} className="border rounded-md p-3 bg-muted/30">
                          <p className="font-semibold text-foreground mb-1">{i + 1}. {d.title}</p>
                          <p className="text-xs text-muted-foreground italic">{d.prompt}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <p className="text-xs text-muted-foreground border-t pt-3">
                  Nākamais solis: AI ģenerēs dizainu attēlus pēc šīm idejām (3. fāze).
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
