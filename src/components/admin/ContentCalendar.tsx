import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Eye, FileText, Loader2, Send, Sparkles, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { ArticleEditorDialog, type EditablePost } from "./ArticleEditorDialog";
import { useContentCategories } from "@/hooks/useContentCategories";

const MONTHS_LV = [
  "Janvāris", "Februāris", "Marts", "Aprīlis", "Maijs", "Jūnijs",
  "Jūlijs", "Augusts", "Septembris", "Oktobris", "Novembris", "Decembris",
];

type CalendarPost = EditablePost & {
  approved_at: string | null;
  published_at: string | null;
  reading_minutes: number | null;
};

/** Month view for batch reviewing, approving and scheduling Idejas un Padomi articles. */
export const ContentCalendar = () => {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditablePost | null>(null);

  const { data: categories = [] } = useContentCategories();
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name_lv])),
    [categories],
  );

  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, month, 1)).toISOString();

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["content-calendar", year, month],
    queryFn: async (): Promise<CalendarPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id,title,slug,excerpt,content,cover_image_url,category_id,seo_title,seo_description,faq,scheduled_for,status,approved_at,published_at,reading_minutes",
        )
        .or(
          `and(scheduled_for.gte.${from},scheduled_for.lt.${to}),and(published_at.gte.${from},published_at.lt.${to})`,
        )
        .order("scheduled_for", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const monthLabel = `${MONTHS_LV[month - 1]} ${year}`;
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  const pending = posts.filter((p) => p.status !== "published" && !p.approved_at);
  const approved = posts.filter((p) => p.status !== "published" && p.approved_at);
  const published = posts.filter((p) => p.status === "published");

  const generateMonth = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content-month", {
        body: { year, month, count: 8 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const created = (data as any)?.created?.length ?? 0;
      const failed = (data as any)?.failed?.length ?? 0;
      toast.success(`Sagatavoti ${created} melnraksti${failed ? `, ${failed} neizdevās` : ""}`);
      await refetch();
      qc.invalidateQueries({ queryKey: ["content-topics"] });
    } catch (e: any) {
      toast.error(e?.message || "Ģenerēšana neizdevās");
    } finally {
      setGenerating(false);
    }
  };

  const setApproval = async (p: CalendarPost, approve: boolean) => {
    setBusyId(p.id);
    const { error } = await supabase
      .from("blog_posts")
      .update({ approved_at: approve ? new Date().toISOString() : null })
      .eq("id", p.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(approve ? "Apstiprināts publicēšanai" : "Apstiprinājums noņemts");
      refetch();
    }
  };

  const publishNow = async (p: CalendarPost) => {
    setBusyId(p.id);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "published", published_at: nowIso, approved_at: p.approved_at ?? nowIso })
      .eq("id", p.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else { toast.success("Publicēts"); refetch(); }
  };

  const approveAll = async () => {
    if (pending.length === 0) return;
    setBusyId("all");
    const { error } = await supabase
      .from("blog_posts")
      .update({ approved_at: new Date().toISOString() })
      .in("id", pending.map((p) => p.id));
    setBusyId(null);
    if (error) toast.error(error.message);
    else { toast.success(`Apstiprināti ${pending.length} raksti`); refetch(); }
  };

  const renderCard = (p: CalendarPost) => (
    <Card key={p.id} className="border border-border">
      <CardContent className="p-3 flex gap-3">
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt="" className="w-20 h-20 rounded-md object-cover border shrink-0" loading="lazy" />
        ) : (
          <div className="w-20 h-20 rounded-md border border-dashed flex items-center justify-center text-[10px] text-muted-foreground text-center shrink-0">
            Nav bildes
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2 flex-wrap">
            <h4 className="font-display text-sm sm:text-base flex-1 min-w-0">{p.title}</h4>
            {p.category_id && (
              <Badge variant="outline" className="text-[10px]">{catName.get(p.category_id) ?? "—"}</Badge>
            )}
            {p.status === "published" ? (
              <Badge className="text-[10px]">Publicēts</Badge>
            ) : p.approved_at ? (
              <Badge variant="secondary" className="text-[10px]">Apstiprināts</Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">Jāpārskata</Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-body">
            {p.scheduled_for
              ? new Date(p.scheduled_for).toLocaleDateString("lv-LV", { day: "numeric", month: "long" })
              : "Bez datuma"}
            {p.reading_minutes ? ` · ${p.reading_minutes} min` : ""}
            {!p.cover_image_url ? " · pievieno bildi" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(p)}>
              <FileText className="w-3.5 h-3.5" /> Rediģēt
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={`/idejas/${p.slug}${p.status !== "published" ? "?preview=1" : ""}`} target="_blank" rel="noreferrer">
                <Eye className="w-3.5 h-3.5" /> Priekšskatīt
              </a>
            </Button>
            {p.status !== "published" && (
              p.approved_at ? (
                <Button size="sm" variant="ghost" className="gap-1.5" disabled={busyId === p.id}
                  onClick={() => setApproval(p, false)}>
                  <Undo2 className="w-3.5 h-3.5" /> Atsaukt
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5" disabled={busyId === p.id} onClick={() => setApproval(p, true)}>
                  {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Apstiprināt
                </Button>
              )
            )}
            {p.status !== "published" && (
              <Button size="sm" variant="ghost" className="gap-1.5" disabled={busyId === p.id} onClick={() => publishNow(p)}>
                <Send className="w-3.5 h-3.5" /> Publicēt tagad
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="p-3 text-xs sm:text-sm text-muted-foreground font-body">
          Reizi mēnesī spied <strong>Sagatavot mēnesi</strong> — AI izveido melnrakstus no tēmu bankas un saliek tos
          kalendārā (otrdienās un ceturtdienās). Tu pārskati, pievieno bildes un apstiprini. Publicējas tikai
          apstiprinātie raksti savā datumā.
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Iepriekšējais mēnesis">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-display text-lg px-2 min-w-[9rem] text-center">{monthLabel}</span>
          <Button size="icon" variant="outline" onClick={() => shift(1)} aria-label="Nākamais mēnesis">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && (
            <Button variant="outline" onClick={approveAll} disabled={busyId === "all"} className="gap-1.5">
              {busyId === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Apstiprināt visus ({pending.length})
            </Button>
          )}
          <Button onClick={generateMonth} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Sagatavot mēnesi
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
          Šim mēnesim vēl nav rakstu. Spied "Sagatavot mēnesi".
        </CardContent></Card>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-display text-sm uppercase tracking-wider text-destructive">
                Jāpārskata ({pending.length})
              </h3>
              {pending.map(renderCard)}
            </section>
          )}
          {approved.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-display text-sm uppercase tracking-wider">
                Gaida publicēšanu ({approved.length})
              </h3>
              {approved.map(renderCard)}
            </section>
          )}
          {published.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">
                Publicēts ({published.length})
              </h3>
              {published.map(renderCard)}
            </section>
          )}
        </div>
      )}

      <ArticleEditorDialog
        post={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => refetch()}
      />
    </div>
  );
};