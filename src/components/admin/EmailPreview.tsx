import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Truck } from "lucide-react";
import {
  renderOrderConfirmationHtml,
  renderTrackingHtml,
  SAMPLE_ORDER,
  SAMPLE_ITEMS,
} from "@/lib/email-previews/templates";

type EmailKind = "confirmation" | "tracking";
type Lang = "lv" | "en";

export const EmailPreview = () => {
  const [kind, setKind] = useState<EmailKind>("confirmation");
  const [lang, setLang] = useState<Lang>("lv");

  const html =
    kind === "confirmation"
      ? renderOrderConfirmationHtml(SAMPLE_ORDER, SAMPLE_ITEMS, lang)
      : renderTrackingHtml(SAMPLE_ORDER);

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-display mb-1">E-pastu priekšskatījums</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-body">
              Pārbaudi, kā izskatīsies e-pasti klientiem pirms sūtīšanas. Dati ir paraugdati.
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
          </div>

          {kind === "confirmation" && (
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