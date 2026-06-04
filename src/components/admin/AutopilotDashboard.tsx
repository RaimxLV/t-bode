import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  status: "generating" | "ready_for_review" | "published" | "archived" | "failed";
};

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

  const load = async () => {
    setLoading(true);
    const [hRes, cRes] = await Promise.all([
      supabase.from("holidays" as any).select("*").eq("is_active", true).order("month").order("day"),
      supabase.from("campaigns" as any).select("id, holiday_id, year, status"),
    ]);
    if (hRes.error) toast.error("Neizdevās ielādēt svētkus");
    else setHolidays((hRes.data as any) || []);
    if (cRes.error) toast.error("Neizdevās ielādēt kampaņas");
    else setCampaigns((cRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStart = async (holiday: Holiday) => {
    const next = nextOccurrence(holiday.month, holiday.day);
    const year = next.getFullYear();
    setStarting(holiday.id);
    try {
      const { error } = await supabase.from("campaigns" as any).insert({
        holiday_id: holiday.id,
        year,
        status: "generating",
      });
      if (error) throw error;
      toast.success(`Kampaņa "${holiday.name_lv} ${year}" izveidota. AI dizainu ģenerēšana drīz būs pieejama.`);
      load();
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
                      {camp.status === "ready_for_review" && <><CheckCircle2 className="w-3 h-3 mr-1" />Gatava skatīšanai</>}
                      {camp.status === "generating" && <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Ģenerē</>}
                      {camp.status === "published" && "Publicēta"}
                      {camp.status === "failed" && "Kļūda"}
                      {camp.status === "archived" && "Arhivēta"}
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
