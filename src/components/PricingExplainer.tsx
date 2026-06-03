import { Shirt, Brush, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PricingExplainerProps {
  className?: string;
  compact?: boolean;
}

export const PricingExplainer = ({ className = "", compact = false }: PricingExplainerProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4 sm:p-5 ${className}`}
    >
      <h4 className="font-display text-base sm:text-lg mb-3 flex items-center gap-2">
        <Percent className="w-4 h-4 text-primary" />
        {t("pricing.explainer.title", "Kā veidojas Tava pasūtījuma cena?")}
      </h4>

      <ul className="space-y-3 font-body text-xs sm:text-sm">
        <li className="flex gap-3">
          <Shirt className="w-4 h-4 mt-0.5 text-foreground flex-shrink-0" />
          <div>
            <span className="font-semibold">
              {t("pricing.explainer.baseTitle", "Produkta bāzes cena")}:
            </span>{" "}
            <span className="text-muted-foreground">
              {t(
                "pricing.explainer.baseDescription",
                "Augstas kvalitātes tekstila izstrādājums (T-krekls vai hūdijs)."
              )}
            </span>
          </div>
        </li>
        <li className="flex gap-3">
          <Brush className="w-4 h-4 mt-0.5 text-foreground flex-shrink-0" />
          <div>
            <span className="font-semibold">
              {t("pricing.explainer.printTitle", "Personalizācija")}:
            </span>{" "}
            <span className="text-muted-foreground">
              {t(
                "pricing.explainer.printDescription",
                "Drukas cena tiek rēķināta pēc dizaina izmēra un sarežģītības, nodrošinot godīgu samaksu tikai par izmantoto laukumu."
              )}
            </span>
          </div>
        </li>
        <li className="flex gap-3">
          <Percent className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
          <div className="w-full">
            <span className="font-semibold">
              {t("pricing.explainer.volumeTitle", "Apjoma atlaide")}:
            </span>{" "}
            <span className="text-muted-foreground">
              {t(
                "pricing.explainer.volumeDescription",
                "Tavs ietaupījums aug kopā ar pasūtījumu."
              )}
            </span>
            {!compact && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Tier qty="5+" pct="−10%" />
                <Tier qty="10+" pct="−15%" />
                <Tier qty="20+" pct="−30%" highlight />
              </div>
            )}
          </div>
        </li>
      </ul>

      {!compact && (
        <p className="mt-3 text-[11px] text-muted-foreground font-body italic leading-relaxed">
          {t(
            "pricing.explainer.note",
            "Atlaides attiecas uz personalizētajiem produktiem un tiek piemērotas automātiski Tavā grozā."
          )}
        </p>
      )}
    </div>
  );
};

const Tier = ({ qty, pct, highlight }: { qty: string; pct: string; highlight?: boolean }) => (
  <div
    className={`text-center rounded-md border px-2 py-1.5 font-body ${
      highlight
        ? "border-primary bg-primary/10"
        : "border-border bg-background/60"
    }`}
  >
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{qty}</div>
    <div className={`text-sm font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{pct}</div>
  </div>
);
