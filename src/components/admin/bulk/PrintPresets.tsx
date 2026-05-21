import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Ruler, Save } from "lucide-react";

export interface PrintPreset {
  id: string;
  name: string;
  width_cm: number;
  height_cm: number;
  dpi: number;
  sort_order: number;
  is_active: boolean;
}

export function PrintPresets() {
  const [presets, setPresets] = useState<PrintPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ name: "", width_cm: 21, height_cm: 29.7, dpi: 460 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("print_presets").select("*").order("sort_order");
    setPresets((data as PrintPreset[]) || []);
    setLoading(false);
  }

  async function addPreset() {
    const name = draft.name.trim();
    if (!name) { toast.error("Norādi nosaukumu"); return; }
    if (draft.width_cm <= 0 || draft.height_cm <= 0 || draft.dpi <= 0) {
      toast.error("Izmēri un DPI jābūt > 0"); return;
    }
    setSaving(true);
    const { error } = await supabase.from("print_presets").insert({
      name, width_cm: draft.width_cm, height_cm: draft.height_cm, dpi: draft.dpi,
      sort_order: presets.length + 1,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDraft({ name: "", width_cm: 21, height_cm: 29.7, dpi: 460 });
    toast.success("Izmērs pievienots");
    await load();
  }

  async function updatePreset(id: string, patch: Partial<PrintPreset>) {
    const { error } = await supabase.from("print_presets").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  }

  async function deletePreset(p: PrintPreset) {
    if (!confirm(`Dzēst "${p.name}"?`)) return;
    const { error } = await supabase.from("print_presets").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dzēsts");
    await load();
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-display">Pievienot jaunu drukas izmēru</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-xs text-muted-foreground font-body">Nosaukums</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="piem. T-krekls L priekša"
                className="px-2 py-1.5 rounded border border-border bg-card text-sm font-body" />
            </label>
            <NumField label="Platums (cm)" value={draft.width_cm} step={0.1}
              onChange={(v) => setDraft({ ...draft, width_cm: v })} />
            <NumField label="Augstums (cm)" value={draft.height_cm} step={0.1}
              onChange={(v) => setDraft({ ...draft, height_cm: v })} />
            <NumField label="DPI" value={draft.dpi} step={1}
              onChange={(v) => setDraft({ ...draft, dpi: Math.round(v) })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={addPreset} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Pievienot
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : presets.length === 0 ? (
        <Card className="border border-dashed border-border">
          <CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
            Vēl nav neviena drukas izmēra.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presets.map((p) => <PresetRow key={p.id} preset={p} onUpdate={updatePreset} onDelete={deletePreset} />)}
        </div>
      )}
    </div>
  );
}

function PresetRow({
  preset, onUpdate, onDelete,
}: {
  preset: PrintPreset;
  onUpdate: (id: string, patch: Partial<PrintPreset>) => Promise<void>;
  onDelete: (p: PrintPreset) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(preset.name);
  const [w, setW] = useState(Number(preset.width_cm));
  const [h, setH] = useState(Number(preset.height_cm));
  const [dpi, setDpi] = useState(preset.dpi);
  const aspect = w / h;

  async function save() {
    await onUpdate(preset.id, { name, width_cm: w, height_cm: h, dpi });
    setEditing(false);
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="border-2 border-primary/60 bg-primary/5 rounded-sm flex-shrink-0"
            style={{
              width: aspect >= 1 ? 56 : 56 * aspect,
              height: aspect >= 1 ? 56 / aspect : 56,
            }}
          />
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-2 py-1 rounded border border-border bg-card text-sm font-body" />
            ) : (
              <p className="text-sm font-display truncate">{preset.name}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px]">{Number(preset.width_cm)}×{Number(preset.height_cm)} cm</Badge>
              <Badge variant="outline" className="text-[10px]">{preset.dpi} DPI</Badge>
            </div>
          </div>
        </div>

        {editing && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <NumField label="W cm" value={w} step={0.1} onChange={setW} small />
            <NumField label="H cm" value={h} step={0.1} onChange={setH} small />
            <NumField label="DPI" value={dpi} step={1} onChange={(v) => setDpi(Math.round(v))} small />
          </div>
        )}

        <div className="flex gap-1.5 pt-1">
          {editing ? (
            <>
              <Button size="sm" className="flex-1 h-7 text-xs bg-primary text-primary-foreground" onClick={save}>
                <Save className="w-3 h-3 mr-1" /> Saglabāt
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setName(preset.name); setW(Number(preset.width_cm)); setH(Number(preset.height_cm)); setDpi(preset.dpi); }}>
                Atcelt
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setEditing(true)}>
                Rediģēt
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => onDelete(preset)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NumField({ label, value, step, onChange, small }: {
  label: string; value: number; step: number; onChange: (v: number) => void; small?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`text-muted-foreground font-body ${small ? "text-[10px]" : "text-xs"}`}>{label}</span>
      <input type="number" min={0} step={step} value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`px-2 rounded border border-border bg-card font-body ${small ? "py-0.5 text-xs" : "py-1.5 text-sm"}`} />
    </label>
  );
}