import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { useProductThemes, type ProductTheme } from "@/hooks/useProductThemes";
import { slugify } from "@/lib/slug";

/** Admin CRUD for ready-made product themes (e.g. Pārgājieni, Ziemassvētki). */
export const ThemeManager = () => {
  const { data: themes = [], isLoading } = useProductThemes();
  const qc = useQueryClient();
  const [nameLv, setNameLv] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [editing, setEditing] = useState<{ id: string; name_lv: string; name_en: string } | null>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["product-themes"] }); qc.invalidateQueries({ queryKey: ["products"] }); };

  const add = async () => {
    const name = nameLv.trim();
    if (!name) return;
    const { error } = await supabase.from("product_themes").insert({ name_lv: name, name_en: nameEn.trim() || null, slug: slugify(name), sort_order: themes.length + 1 });
    if (error) toast.error(error.message.includes("duplicate") ? "Šāda tēma jau ir" : "Neizdevās pievienot tēmu");
    else { toast.success("Tēma pievienota"); setNameLv(""); setNameEn(""); refresh(); }
  };

  const save = async () => {
    if (!editing || !editing.name_lv.trim()) return;
    const { error } = await supabase.from("product_themes").update({ name_lv: editing.name_lv.trim(), name_en: editing.name_en.trim() || null }).eq("id", editing.id);
    if (error) toast.error("Neizdevās saglabāt tēmu"); else { setEditing(null); refresh(); }
  };

  const toggleActive = async (t: ProductTheme) => {
    const { error } = await supabase.from("product_themes").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) toast.error("Neizdevās mainīt redzamību"); else refresh();
  };

  const remove = async (t: ProductTheme) => {
    if (!confirm(`Dzēst tēmu "${t.name_lv}"? Produkti netiks dzēsti, tikai noņemta šī tēma.`)) return;
    const { error } = await supabase.from("product_themes").delete().eq("id", t.id);
    if (error) toast.error("Neizdevās dzēst tēmu"); else { toast.success("Tēma dzēsta"); refresh(); }
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-display flex items-center gap-2"><Tags className="w-4 h-4" /> Gatavo produktu tēmas</h3>
          <p className="text-xs sm:text-sm text-muted-foreground font-body">Produktam var piešķirt vairākas tēmas. Klienti veikalā var filtrēt pēc tēmas.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div><Label htmlFor="theme-lv" className="text-xs">Nosaukums (LV)</Label><Input id="theme-lv" value={nameLv} onChange={(e) => setNameLv(e.target.value)} placeholder="Pārgājieni" onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <div><Label htmlFor="theme-en" className="text-xs">Name (EN)</Label><Input id="theme-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Hiking" onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <Button onClick={add} disabled={!nameLv.trim()}><Plus className="w-4 h-4 mr-1" /> Pievienot</Button>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Ielādē…</p> : themes.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body">Vēl nav tēmu.</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg">
            {themes.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 p-2 sm:p-3">
                {editing?.id === t.id ? (
                  <>
                    <Input aria-label="Nosaukums (LV)" className="h-8 flex-1 min-w-[8rem]" value={editing.name_lv} onChange={(e) => setEditing({ ...editing, name_lv: e.target.value })} />
                    <Input aria-label="Name (EN)" className="h-8 flex-1 min-w-[8rem]" value={editing.name_en} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={save} aria-label="Saglabāt"><Check className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Atcelt"><X className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 font-body text-sm">{t.name_lv}{t.name_en && <span className="text-muted-foreground"> · {t.name_en}</span>}</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} aria-label={`Rādīt tēmu ${t.name_lv} veikalā`} /> Rādīt veikalā
                    </label>
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ id: t.id, name_lv: t.name_lv, name_en: t.name_en ?? "" })} aria-label={`Rediģēt ${t.name_lv}`}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(t)} aria-label={`Dzēst ${t.name_lv}`}><Trash2 className="w-4 h-4" /></Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
