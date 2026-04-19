import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Building2, Landmark, FileText } from "lucide-react";

interface SiteSettings {
  id: string;
  company_name: string;
  company_reg_number: string | null;
  company_vat_number: string | null;
  company_address: string | null;
  bank_name: string;
  bank_iban: string;
  bank_swift: string;
  bank_beneficiary: string;
  payment_instructions_lv: string | null;
  payment_instructions_en: string | null;
}

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <Card className="border border-border">
    <CardContent className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-base sm:text-lg font-display">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </CardContent>
  </Card>
);

const Field = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs sm:text-sm">{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const SettingsManager = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
    if (error) {
      toast.error("Neizdevās ielādēt iestatījumus");
    } else if (data) {
      setSettings(data as SiteSettings);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (patch: Partial<SiteSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...rest } = settings;
    const { error } = await supabase
      .from("site_settings")
      .update({
        ...rest,
        company_reg_number: rest.company_reg_number ?? "",
        company_vat_number: rest.company_vat_number ?? "",
        company_address: rest.company_address ?? "",
        payment_instructions_lv: rest.payment_instructions_lv ?? "",
        payment_instructions_en: rest.payment_instructions_en ?? "",
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Kļūda saglabājot: " + error.message);
    } else {
      toast.success("Iestatījumi saglabāti");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-muted-foreground text-center py-12 font-body">Iestatījumi nav atrasti.</p>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Section icon={Building2} title="Uzņēmuma dati">
        <Field label="Uzņēmuma nosaukums" value={settings.company_name} onChange={(v) => update({ company_name: v })} placeholder="SIA Ervitex" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Reģ. Nr." value={settings.company_reg_number ?? ""} onChange={(v) => update({ company_reg_number: v })} placeholder="40003XXXXXX" />
          <Field label="PVN reģ. Nr." value={settings.company_vat_number ?? ""} onChange={(v) => update({ company_vat_number: v })} placeholder="LV40003XXXXXX" />
        </div>
        <Field label="Juridiskā adrese" value={settings.company_address ?? ""} onChange={(v) => update({ company_address: v })} placeholder="Iela 1, Rīga, LV-1000" />
      </Section>

      <Section icon={Landmark} title="Bankas rekvizīti">
        <Field label="Saņēmējs (Beneficiary)" value={settings.bank_beneficiary} onChange={(v) => update({ bank_beneficiary: v })} placeholder="SIA Ervitex" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Banka" value={settings.bank_name} onChange={(v) => update({ bank_name: v })} placeholder="Swedbank" />
          <Field label="SWIFT / BIC" value={settings.bank_swift} onChange={(v) => update({ bank_swift: v })} placeholder="HABALV22" />
        </div>
        <Field label="IBAN" value={settings.bank_iban} onChange={(v) => update({ bank_iban: v })} placeholder="LV00HABA0000000000000" />
      </Section>

      <Section icon={FileText} title="Maksājuma instrukcijas">
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Latviski (LV)</Label>
          <Textarea
            rows={4}
            value={settings.payment_instructions_lv ?? ""}
            onChange={(e) => update({ payment_instructions_lv: e.target.value })}
            placeholder="Lūdzu norādiet pasūtījuma numuru maksājuma mērķī..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">English (EN)</Label>
          <Textarea
            rows={4}
            value={settings.payment_instructions_en ?? ""}
            onChange={(e) => update({ payment_instructions_en: e.target.value })}
            placeholder="Please include the order number in the payment reference..."
          />
        </div>
      </Section>

      <div className="sticky bottom-20 sm:bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground shadow-lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saglabā..." : "Saglabāt iestatījumus"}
        </Button>
      </div>
    </div>
  );
};
