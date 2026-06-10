import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles, AlertCircle, Loader2, ArrowRight, CheckCircle2, Wand2, FileText, Image as ImageIcon, FileEdit as FileEditIcon } from "lucide-react";
import { toast } from "sonner";
import { CampaignWizard } from "./CampaignWizard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FreeDesignStudio } from "./FreeDesignStudio";

const BlogManager = lazy(() => import("./BlogManager").then((m) => ({ default: m.BlogManager })));
const PrintZonesManager = lazy(() => import("./PrintZonesManager").then((m) => ({ default: m.PrintZonesManager })));
const DesignsToProducts = lazy(() => import("./DesignsToProducts").then((m) => ({ default: m.DesignsToProducts })));
const DesignLibrary = lazy(() => import("./bulk/DesignLibrary").then((m) => ({ default: m.DesignLibrary })));

const SubTabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

type Holiday = {
  id: string;
  name_lv: string;
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
  status: string;
  title: string | null;
  brief: any;
};

const MONTHS_LV = ["Janv.", "Febr.", "Marts", "Apr.", "Maijs", "Jūn.", "Jūl.", "Aug.", "Sept.", "Okt.", "Nov.", "Dec."];

function nextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const y = now.getFullYear();
  const d = new Date(y, month - 1, day);
  return d < now ? new Date(y + 1, month - 1, day) : d;
}
function daysUntil(d: Date) { return Math.ceil((d.getTime() - Date.now()) / 86400000); }

function statusLabel(status: string): { text: string; tone: "muted" | "warn" | "ready" | "active" | "error" } {
  switch (status) {
    case "generating": return { text: "Ģenerē idejas…", tone: "muted" };
    case "ready_for_review": return { text: "Gaida tavu apstiprinājumu (1. solis)", tone: "ready" };
    case "generating_designs": return { text: "Ģenerē dizainus…", tone: "muted" };
    case "designs_ready": return { text: "Gaida tavu apstiprinājumu (2. solis)", tone: "ready" };
    case "products_ready":
    case "blog_ready": return { text: "Gatavs publicēšanai (3. solis)", tone: "ready" };
    case "published":
    case "active": return { text: "Publicēta", tone: "active" };
    case "failed": return { text: "Kļūda — pārstartē soli", tone: "error" };
    case "archived": return { text: "Arhivēta", tone: "muted" };
    default: return { text: "Melnraksts", tone: "muted" };
  }
}

const PENDING = new Set(["ready_for_review", "designs_ready", "products_ready", "blog_ready"]);

type AutopilotDashboardProps = {
  draftProducts?: any[];
  loadingProducts?: boolean;
  renderProductGrid?: (items: any[], forDesign: boolean) => ReactNode;
};

export const AutopilotDashboard = ({
  draftProducts = [],
  loadingProducts = false,
  renderProductGrid,
}: AutopilotDashboardProps) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [wizardId, setWizardId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [hRes, cRes] = await Promise.all([
      supabase.from("holidays" as any).select("*").eq("is_active", true).order("month").order("day"),
      supabase.from("campaigns" as any).select("id, holiday_id, year, status, title, brief"),
    ]);
    if (!hRes.error) setHolidays((hRes.data as any) ?? []);
    if (!cRes.error) setCampaigns((cRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStart = async (h: Holiday) => {
    const next = nextOccurrence(h.month, h.day);
    const year = next.getFullYear();
    setStarting(h.id);
    try {
      const placeholder = `${h.name_lv} ${year}`;
      const { data: insRaw, error } = await supabase.from("campaigns" as any).insert({
        holiday_id: h.id, year, status: "generating", title: placeholder,
      }).select("id").maybeSingle();
      if (error) throw error;
      const ins = insRaw as unknown as { id: string } | null;
      toast.success(`"${placeholder}" izveidota. AI ģenerē idejas…`);
      if (ins?.id) {
        await supabase.functions.invoke("generate-campaign-brief", { body: { campaign_id: ins.id } });
      }
      await load();
      if (ins?.id) setWizardId(ins.id);
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "Šī kampaņa šim gadam jau eksistē" : "Neizdevās: " + e.message);
    } finally { setStarting(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const sorted = [...holidays].sort((a, b) => nextOccurrence(a.month, a.day).getTime() - nextOccurrence(b.month, b.day).getTime());
  const campOf = (hid: string, year: number) => campaigns.find((c) => c.holiday_id === hid && c.year === year);

  return (
    <Tabs defaultValue="holidays" className="w-full space-y-4">
      <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1">
        <TabsTrigger value="holidays" className="gap-1.5">
          <Calendar className="w-4 h-4" /> Svētku kampaņas
        </TabsTrigger>
        <TabsTrigger value="studio" className="gap-1.5">
          <Wand2 className="w-4 h-4" /> AI Studija
        </TabsTrigger>
        <TabsTrigger value="blog" className="gap-1.5">
          <FileText className="w-4 h-4" /> Svētku iedvesmai
        </TabsTrigger>
        <TabsTrigger value="printzones" className="gap-1.5">
          <Wand2 className="w-4 h-4" /> Print zonas
        </TabsTrigger>
        <TabsTrigger value="designstoproducts" className="gap-1.5">
          <Sparkles className="w-4 h-4" /> Dizaini → Krekli
        </TabsTrigger>
        <TabsTrigger value="designlibrary" className="gap-1.5">
          <ImageIcon className="w-4 h-4" /> Dizainu bibliotēka
        </TabsTrigger>
        <TabsTrigger value="drafts" className="gap-1.5">
          <FileEditIcon className="w-4 h-4" /> Melnraksti
          {draftProducts.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{draftProducts.length}</Badge>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="holidays" className="space-y-4 mt-0">
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold mb-1">Autopilot — svētku kampaņas</p>
            <p className="text-muted-foreground">
              AI ģenerē idejas, dizainus un blogu. Tu izej cauri 3 soļu vednim un publicē visu vienlaicīgi. Visi produkti sākotnēji ir paslēpti no veikala.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((h) => {
          const next = nextOccurrence(h.month, h.day);
          const days = daysUntil(next);
          const isReady = days <= h.lead_days;
          const camp = campOf(h.id, next.getFullYear());
          const label = camp ? statusLabel(camp.status) : null;
          const pending = camp && PENDING.has(camp.status);

          return (
            <Card key={h.id} className={`border transition ${isReady ? "border-primary/40" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="font-display text-lg truncate">{h.name_lv}</h3>
                      {pending && <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />}
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      {h.day}. {MONTHS_LV[h.month - 1]} {next.getFullYear()} — <strong>{days} dienas</strong>
                    </p>
                  </div>
                  {label ? (
                    <Badge variant={label.tone === "ready" ? "default" : label.tone === "active" ? "secondary" : "outline"} className="shrink-0">
                      {label.tone === "active" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {label.tone === "muted" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {label.text}
                    </Badge>
                  ) : isReady ? (
                    <Badge className="shrink-0"><Sparkles className="w-3 h-3 mr-1" />Gatava sākt</Badge>
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

                {!camp ? (
                  <Button size="sm" variant={isReady ? "default" : "outline"} disabled={!isReady || starting === h.id} onClick={() => handleStart(h)} className="w-full">
                    {starting === h.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Veido…</> : "Sākt kampaņu"}
                  </Button>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => setWizardId(camp.id)} variant={pending ? "default" : "outline"}>
                    {pending ? "Atvērt vedni" : "Apskatīt"} <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CampaignWizard
        open={!!wizardId}
        campaignId={wizardId}
        onOpenChange={(o) => !o && setWizardId(null)}
        onChanged={() => load()}
      />
      </TabsContent>

      <TabsContent value="studio" className="mt-0">
        <FreeDesignStudio />
      </TabsContent>

      <TabsContent value="blog" className="mt-0">
        <Suspense fallback={<SubTabFallback />}>
          <BlogManager />
        </Suspense>
      </TabsContent>

      <TabsContent value="printzones" className="mt-0">
        <Suspense fallback={<SubTabFallback />}>
          <PrintZonesManager />
        </Suspense>
      </TabsContent>

      <TabsContent value="designstoproducts" className="mt-0">
        <Suspense fallback={<SubTabFallback />}>
          <DesignsToProducts />
        </Suspense>
      </TabsContent>

      <TabsContent value="designlibrary" className="mt-0">
        <Suspense fallback={<SubTabFallback />}>
          <DesignLibrary />
        </Suspense>
      </TabsContent>

      <TabsContent value="drafts" className="mt-0">
        {loadingProducts ? (
          <p className="text-muted-foreground text-center py-12 font-body">Ielādē…</p>
        ) : draftProducts.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
            Nav neviena produkta melnraksta. Tie tiek izveidoti automātiski no Autopilot kampaņām vai pārvēršot dizainus par produktiem.
          </CardContent></Card>
        ) : renderProductGrid ? (
          renderProductGrid(draftProducts, false)
        ) : null}
      </TabsContent>
    </Tabs>
  );
};