import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Building2, Landmark, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

// IBAN length per country (subset of common EU + LV neighbours)
const IBAN_LENGTHS: Record<string, number> = {
  LV: 21, LT: 20, EE: 20, FI: 18, SE: 24, DE: 22, GB: 22, IE: 22, FR: 27,
  ES: 24, IT: 27, NL: 18, BE: 16, AT: 20, PL: 28, DK: 18, NO: 15, PT: 25,
  LU: 20, CH: 21, CZ: 24, SK: 24, HU: 28, RO: 24, BG: 22, HR: 21, SI: 19,
  GR: 27, CY: 28, MT: 31, IS: 26,
};

const normalizeIban = (raw: string) => raw.replace(/\s+/g, "").toUpperCase();

/** Validate IBAN: format + country length + mod-97 checksum. Returns null if valid, else error key. */
const validateIban = (raw: string): string | null => {
  const iban = normalizeIban(raw);
  if (!iban) return "IBAN ir obligāts";
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return "Nederīgs IBAN formāts";
  const country = iban.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && iban.length !== expected) return `${country} IBAN jābūt ${expected} simbolu garumā`;
  // mod-97: move first 4 chars to end, replace letters with digits (A=10..Z=35), check % 97 === 1
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString());
  // Process in chunks to avoid BigInt overhead
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  if (remainder !== 1) return "Nederīga IBAN kontrolsumma";
  return null;
};

const formatIban = (raw: string) => normalizeIban(raw).replace(/(.{4})/g, "$1 ").trim();

const normalizeSwift = (raw: string) => raw.replace(/\s+/g, "").toUpperCase();

/** Validate SWIFT/BIC: 8 or 11 chars, format AAAA BB CC [DDD]. Returns null if valid. */
const validateSwift = (raw: string): string | null => {
  const swift = normalizeSwift(raw);
  if (!swift) return "SWIFT/BIC ir obligāts";
  if (swift.length !== 8 && swift.length !== 11) return "SWIFT/BIC jābūt 8 vai 11 simbolu garumā";
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift)) return "Nederīgs SWIFT/BIC formāts";
  return null;
};

/** LV uzņēmuma reģ.Nr.: tieši 11 cipari. Tukšs = OK (lauks nav obligāts). */
const validateRegNumber = (raw: string): string | null => {
  const v = raw.replace(/\s+/g, "");
  if (!v) return null;
  if (!/^\d{11}$/.test(v)) return "Reģ.Nr. jābūt 11 cipariem";
  return null;
};

/** LV PVN reģ.Nr.: LV + 11 cipari. Tukšs = OK. */
const validateVatNumber = (raw: string): string | null => {
  const v = raw.replace(/\s+/g, "").toUpperCase();
  if (!v) return null;
  if (!/^LV\d{11}$/.test(v)) return "PVN nr. formāts: LV + 11 cipari";
  return null;
};

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

  const ibanError = settings ? validateIban(settings.bank_iban) : null;
  const swiftError = settings ? validateSwift(settings.bank_swift) : null;

  const handleSave = async () => {
    if (!settings) return;
    if (ibanError) {
      toast.error("Nederīgs IBAN — " + ibanError);
      return;
    }
    if (swiftError) {
      toast.error("Nederīgs SWIFT/BIC — " + swiftError);
      return;
    }
    setSaving(true);
    const { id, ...rest } = settings;
    const normalizedIban = normalizeIban(rest.bank_iban);
    const { error } = await supabase
      .from("site_settings")
      .update({
        ...rest,
        bank_iban: normalizedIban,
        bank_swift: rest.bank_swift.trim().toUpperCase(),
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
      update({ bank_iban: normalizedIban });
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
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">SWIFT / BIC</Label>
            <Input
              value={settings.bank_swift}
              onChange={(e) => update({ bank_swift: e.target.value })}
              onBlur={() => update({ bank_swift: normalizeSwift(settings.bank_swift) })}
              placeholder="HABALV22"
              maxLength={11}
              className={swiftError && settings.bank_swift ? "border-destructive focus-visible:ring-destructive" : ""}
              aria-invalid={!!swiftError}
            />
            {settings.bank_swift && swiftError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {swiftError}
              </p>
            )}
            {settings.bank_swift && !swiftError && (
              <p className="text-xs text-primary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Derīgs SWIFT/BIC
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">IBAN</Label>
          <Input
            value={settings.bank_iban}
            onChange={(e) => update({ bank_iban: e.target.value })}
            onBlur={() => !ibanError && update({ bank_iban: formatIban(settings.bank_iban) })}
            placeholder="LV80 BANK 0000 4351 9500 1"
            className={ibanError && settings.bank_iban ? "border-destructive focus-visible:ring-destructive" : ""}
            aria-invalid={!!ibanError}
          />
          {settings.bank_iban && ibanError && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {ibanError}
            </p>
          )}
          {settings.bank_iban && !ibanError && (
            <p className="text-xs text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Derīgs IBAN
            </p>
          )}
        </div>
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
        <Button onClick={handleSave} disabled={saving || !!ibanError || !!swiftError} className="bg-primary text-primary-foreground shadow-lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saglabā..." : "Saglabāt iestatījumus"}
        </Button>
      </div>
    </div>
  );
};
