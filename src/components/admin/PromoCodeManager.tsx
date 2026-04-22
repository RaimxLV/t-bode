import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, Percent, Euro, Truck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type DiscountType = "percentage" | "fixed" | "free_shipping";

type PromoCode = {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_total: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

type FormState = {
  id?: string;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order_total: string;
  max_uses: string;
  valid_until: string;
  is_active: boolean;
  description: string;
};

const EMPTY: FormState = {
  code: "",
  discount_type: "percentage",
  discount_value: "10",
  min_order_total: "0",
  max_uses: "",
  valid_until: "",
  is_active: true,
  description: "",
};

const TYPE_LABEL: Record<DiscountType, string> = {
  percentage: "Procenti",
  fixed: "Fiksēta summa",
  free_shipping: "Bezmaksas piegāde",
};

const TYPE_ICON: Record<DiscountType, React.ComponentType<{ className?: string }>> = {
  percentage: Percent,
  fixed: Euro,
  free_shipping: Truck,
};

export const PromoCodeManager = () => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Neizdevās ielādēt atlaižu kodus");
    else setCodes((data ?? []) as PromoCode[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: codes.length,
    active: codes.filter((c) => c.is_active).length,
    redemptions: codes.reduce((sum, c) => sum + c.used_count, 0),
  }), [codes]);

  const openCreate = () => { setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (c: PromoCode) => {
    setForm({
      id: c.id,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_total: String(c.min_order_total),
      max_uses: c.max_uses?.toString() ?? "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 10) : "",
      is_active: c.is_active,
      description: c.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    if (code.length < 3) { toast.error("Kodam jābūt vismaz 3 simboliem"); return; }
    const value = Number(form.discount_value);
    if (Number.isNaN(value) || value < 0) { toast.error("Nederīga atlaides vērtība"); return; }
    if (form.discount_type === "percentage" && value > 100) {
      toast.error("Procentu atlaide nevar pārsniegt 100%"); return;
    }
    setSaving(true);
    const payload = {
      code,
      discount_type: form.discount_type,
      discount_value: value,
      min_order_total: Number(form.min_order_total) || 0,
      max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      is_active: form.is_active,
      description: form.description.trim() || null,
    };
    const res = form.id
      ? await supabase.from("promo_codes").update(payload).eq("id", form.id)
      : await supabase.from("promo_codes").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message.includes("duplicate") ? "Šāds kods jau eksistē" : res.error.message);
      return;
    }
    toast.success(form.id ? "Kods atjaunināts" : "Kods izveidots");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Dzēst kodu "${code}"?`)) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast.error("Neizdevās dzēst");
    else { toast.success("Kods dzēsts"); load(); }
  };

  const handleToggleActive = async (c: PromoCode) => {
    const { error } = await supabase.from("promo_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) toast.error("Neizdevās mainīt statusu");
    else load();
  };

  const formatDiscount = (c: PromoCode) => {
    if (c.discount_type === "percentage") return `−${c.discount_value}%`;
    if (c.discount_type === "fixed") return `−${Number(c.discount_value).toFixed(2)} €`;
    return "Bezmaksas piegāde";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-display">Atlaižu kodi</h2>
          <p className="text-xs text-muted-foreground font-body">{stats.total} kodi · {stats.active} aktīvi · {stats.redemptions} izmantošanas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Jauns kods
          </Button>
        </div>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground font-body">Ielādē...</div>
          ) : codes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-body">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Vēl nav neviena atlaižu koda. Izveido pirmo!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {codes.map((c) => {
                const Icon = TYPE_ICON[c.discount_type];
                const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
                const isUsedUp = c.max_uses !== null && c.used_count >= c.max_uses;
                return (
                  <div key={c.id} className="p-3 sm:p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm">{c.code}</span>
                        <Badge variant="outline" className="text-xs">{formatDiscount(c)}</Badge>
                        {!c.is_active && <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Neaktīvs</Badge>}
                        {isExpired && <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">Beidzies</Badge>}
                        {isUsedUp && <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">Izsmelts</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-body mt-1">
                        {c.description ? c.description + " · " : ""}
                        Izmantots {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                        {c.min_order_total > 0 ? ` · min ${Number(c.min_order_total).toFixed(2)} €` : ""}
                        {c.valid_until ? ` · līdz ${new Date(c.valid_until).toLocaleDateString("lv-LV")}` : ""}
                      </p>
                    </div>
                    <Switch checked={c.is_active} onCheckedChange={() => handleToggleActive(c)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.code)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{form.id ? "Labot kodu" : "Jauns atlaižu kods"}</DialogTitle>
            <DialogDescription>
              Konfigurē atlaides veidu, vērtību un derīgumu. Kods tiks automātiski normalizēts uz lielajiem burtiem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-body">Kods *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VASARA2026"
                className="font-mono uppercase"
                maxLength={40}
              />
            </div>
            <div>
              <Label className="text-sm font-body">Atlaides tips *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["percentage", "fixed", "free_shipping"] as DiscountType[]).map((tp) => {
                  const Icon = TYPE_ICON[tp];
                  return (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setForm({ ...form, discount_type: tp })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-body transition-colors ${
                        form.discount_type === tp ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {TYPE_LABEL[tp]}
                    </button>
                  );
                })}
              </div>
            </div>
            {form.discount_type !== "free_shipping" && (
              <div>
                <Label className="text-sm font-body">
                  Atlaides vērtība * {form.discount_type === "percentage" ? "(0–100 %)" : "(€)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.discount_type === "percentage" ? 100 : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-body">Min. pasūtījums (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.min_order_total}
                  onChange={(e) => setForm({ ...form, min_order_total: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-body">Max izmantošanas (tukšs = neierobežots)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="∞"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-body">Derīgs līdz (tukšs = bez termiņa)</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-body">Apraksts (iekšējs)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Piem. Vasaras kampaņa Instagram"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-sm font-body">Aktīvs</span>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Atcelt</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Saglabā..." : form.id ? "Saglabāt" : "Izveidot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};