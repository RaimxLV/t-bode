import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Truck, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import {
  renderOrderConfirmationHtml,
  renderTrackingHtml,
  renderPickupReadyHtml,
  renderBankInstructionsHtml,
  renderPaymentReminderHtml,
  renderOrderCancelledHtml,
  renderContactReplyHtml,
  SAMPLE_ORDER,
  SAMPLE_ITEMS,
  type EmailSettings,
} from "@/lib/email-previews/templates";

type EmailKind = "confirmation" | "tracking" | "pickupReady" | "bankInstructions" | "paymentReminder" | "cancelled" | "contactReply";
type Lang = "lv" | "en";

export const EmailPreview = () => {
  const [kind, setKind] = useState<EmailKind>("confirmation");
  const [lang, setLang] = useState<Lang>("lv");
  const [settings, setSettings] = useState<EmailSettings | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_settings");
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setSettings(row as EmailSettings);
    })();
  }, []);

  const html = (() => {
    switch (kind) {
      case "confirmation":
        return renderOrderConfirmationHtml(SAMPLE_ORDER, SAMPLE_ITEMS, lang, settings);
      case "tracking":
        return renderTrackingHtml(SAMPLE_ORDER, settings);
      case "pickupReady":
        return renderPickupReadyHtml(SAMPLE_ORDER, settings);
      case "bankInstructions":
        return renderBankInstructionsHtml(SAMPLE_ORDER, settings);
      case "paymentReminder":
        return renderPaymentReminderHtml(SAMPLE_ORDER, settings);
      case "cancelled":
        return renderOrderCancelledHtml(SAMPLE_ORDER, settings);
      case "contactReply":
        return renderContactReplyHtml(SAMPLE_ORDER.shipping_name, settings);
      default:
        return renderOrderConfirmationHtml(SAMPLE_ORDER, SAMPLE_ITEMS, lang, settings);
    }
  })();

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-display mb-1">E-pastu priekšskatījums</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-body">
              Pārbaudi, kā izskatīsies e-pasti klientiem. Lai mainītu biroja adresi, darba laiku, atbalsta e-pastu vai ievadtekstus —
              dodies uz <strong>Iestatījumi → E-pasta saturs (biroja info)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={kind === "confirmation" ? "default" : "outline"}
              onClick={() => setKind("confirmation")}
              className="gap-1.5"
            >
              <Mail className="w-4 h-4" /> Pasūtījums apstiprināts
            </Button>
            <Button
              size="sm"
              variant={kind === "tracking" ? "default" : "outline"}
              onClick={() => setKind("tracking")}
              className="gap-1.5"
            >
              <Truck className="w-4 h-4" /> Pasūtījums nosūtīts
            </Button>
            <Button size="sm" variant={kind === "pickupReady" ? "default" : "outline"} onClick={() => setKind("pickupReady")} className="gap-1.5">
              <Mail className="w-4 h-4" /> Gatavs saņemšanai
            </Button>
            <Button size="sm" variant={kind === "bankInstructions" ? "default" : "outline"} onClick={() => setKind("bankInstructions")} className="gap-1.5">
              <Mail className="w-4 h-4" /> Bankas rekvizīti
            </Button>
            <Button size="sm" variant={kind === "paymentReminder" ? "default" : "outline"} onClick={() => setKind("paymentReminder")} className="gap-1.5">
              <Mail className="w-4 h-4" /> Apmaksas atgādinājums
            </Button>
            <Button size="sm" variant={kind === "cancelled" ? "default" : "outline"} onClick={() => setKind("cancelled")} className="gap-1.5">
              <Mail className="w-4 h-4" /> Pasūtījums atcelts
            </Button>
            <Button size="sm" variant={kind === "contactReply" ? "default" : "outline"} onClick={() => setKind("contactReply")} className="gap-1.5">
              <Mail className="w-4 h-4" /> Atbilde uz kontaktu
            </Button>
          </div>

          {(kind === "confirmation") && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={lang === "lv" ? "secondary" : "ghost"}
                onClick={() => setLang("lv")}
              >
                LV
              </Button>
              <Button
                size="sm"
                variant={lang === "en" ? "secondary" : "ghost"}
                onClick={() => setLang("en")}
              >
                EN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border overflow-hidden">
        <CardContent className="p-0">
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox=""
            className="w-full bg-white"
            style={{ height: "720px", border: "none" }}
          />
        </CardContent>
      </Card>
    </div>
  );
};