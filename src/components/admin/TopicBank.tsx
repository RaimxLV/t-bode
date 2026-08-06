import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useContentCategories } from "@/hooks/useContentCategories";

type Topic = {
  id: string;
  title_lv: string;
  category_id: string | null;
  primary_keyword: string | null;
  angle_hint: string | null;
  priority: number;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  idea: "Brīva tēma",
  drafted: "Melnrakstā",
  published: "Publicēts",
  skipped: "Izlaista",
};

/** Backlog of article topics the month generator draws from. */
export const TopicBank = () => {
  const qc = useQueryClient();
  const { data: categories = [] } = useContentCategories();
  const [filter, setFilter] = useState<string>("idea");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: topics = [], isLoading, refetch } = useQuery({
    queryKey: ["content-topics", filter],
    queryFn: async (): Promise<Topic[]> => {
      let q = supabase
        .from("content_topics")
        .select("id,title_lv,category_id,primary_keyword,angle_hint,priority,status")
        .order("priority")
        .order("created_at", { ascending: false });
      if (filter === "idea") q = q.eq("status", "idea").is("used_post_id", null);
      else if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const catName = new Map(categories.map((c) => [c.id, c.name_lv]));

  const addTopic = async () => {
    if (!newTitle.trim()) { toast.error("Ieraksti tēmas nosaukumu"); return; }
    if (!newCategory) { toast.error("Izvēlies kategoriju"); return; }
    setSaving(true);
    const { error } = await supabase.from("content_topics").insert({
      title_lv: newTitle.trim(),
      category_id: newCategory,
      primary_keyword: newKeyword.trim() || null,
      status: "idea",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setNewTitle(""); setNewKeyword("");
    toast.success("Tēma pievienota");
    refetch();
  };

  const remove = async (t: Topic) => {
    const { error } = await supabase.from("content_topics").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else { toast.success("Dzēsts"); refetch(); qc.invalidateQueries({ queryKey: ["content-topics"] }); }
  };

  const reopen = async (t: Topic) => {
    const { error } = await supabase
      .from("content_topics")
      .update({ status: "idea", used_post_id: null })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else { toast.success("Atgriezta tēmu bankā"); refetch(); }
  };

  const generateTopics = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-content-topics", {
        body: { count: 12 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const created = (data as any)?.created ?? 0;
      toast.success(`AI pievienoja ${created} jaunas tēmas`);
      setFilter("idea");
      await qc.invalidateQueries({ queryKey: ["content-topics"] });
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "Tēmu ģenerēšana neizdevās");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <p className="font-display text-sm uppercase tracking-wider">Pievienot tēmu</p>
          <div className="grid sm:grid-cols-[1fr_180px_180px_auto] gap-2">
            <Input placeholder="Tēmas nosaukums" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger><SelectValue placeholder="Kategorija" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_lv}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Atslēgvārds (Google)" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
            <Button onClick={addTopic} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Pievienot
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="idea">Brīvās tēmas</SelectItem>
            <SelectItem value="drafted">Melnrakstā</SelectItem>
            <SelectItem value="published">Publicētās</SelectItem>
            <SelectItem value="all">Visas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground font-body">{topics.length} tēmas</span>
        <Button variant="outline" className="gap-1.5 sm:ml-auto" onClick={generateTopics} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Ģenerēt tēmas ar AI
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : topics.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
          Nav tēmu šajā sarakstā.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {topics.map((t) => (
            <Card key={t.id} className="border border-border">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-sm">{t.title_lv}</span>
                    {t.category_id && (
                      <Badge variant="outline" className="text-[10px]">{catName.get(t.category_id) ?? "—"}</Badge>
                    )}
                    <Badge variant={t.status === "idea" ? "secondary" : "outline"} className="text-[10px]">
                      {STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                  </div>
                  {t.primary_keyword && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{t.primary_keyword}</p>
                  )}
                </div>
                {t.status !== "idea" && (
                  <Button size="sm" variant="ghost" onClick={() => reopen(t)}>Atbrīvot</Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(t)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};