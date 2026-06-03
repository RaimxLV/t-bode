interface PricingExplainerProps {
  className?: string;
  compact?: boolean;
}

export const PricingExplainer = ({ className = "", compact = false }: PricingExplainerProps) => {
  return (
    <div
      className={`rounded-2xl border-2 border-cta-red/20 bg-gradient-to-br from-cta-red/5 via-card to-card p-5 sm:p-6 shadow-sm ${className}`}
    >
      <h4 className="font-display text-lg sm:text-xl mb-4 tracking-wide">
        💰 KĀ VEIDOJAS TAVA PASŪTĪJUMA CENA?
      </h4>

      <ul className="space-y-3 font-body text-[13px] sm:text-sm">
        <li className="flex gap-3 items-start">
          <span className="text-xl leading-none">📦</span>
          <div>
            <span className="font-bold text-foreground">Apģērba bāzes cena:</span>{" "}
            <span className="text-muted-foreground">
              Premium kvalitātes izstrādājuma cena (atkarībā no izvēlētā modeļa un krāsas).
            </span>
          </div>
        </li>
        <li className="flex gap-3 items-start">
          <span className="text-xl leading-none">🖌️</span>
          <div>
            <span className="font-bold text-foreground">Personalizācija (Druka):</span>{" "}
            <span className="text-muted-foreground">
              Drukas cena tiek rēķināta tikai par reāli izmantoto laukumu (cm²) un pievienotajiem elementiem.
            </span>
          </div>
        </li>
        <li className="flex gap-3 items-start">
          <span className="text-xl leading-none">📈</span>
          <div className="w-full">
            <span className="font-bold text-foreground">Apjoma atlaide:</span>{" "}
            <span className="text-muted-foreground">
              Tavs ietaupījums aug automātiski līdz ar preču skaitu grozā:
            </span>
            {!compact && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Tier qty="5+ gab." pct="-10%" emoji="💥" />
                <Tier qty="10+ gab." pct="-15%" emoji="🚀" />
                <Tier qty="20+ gab." pct="-30%" emoji="👑" highlight />
              </div>
            )}
          </div>
        </li>
      </ul>

      {!compact && (
        <p className="mt-4 text-[11px] sm:text-xs text-muted-foreground font-body italic leading-relaxed border-t border-border pt-3">
          Piezīme: Apjoma atlaides tiek rēķinātas no kopējās summas (apģērbs + druka) un attiecas uz visiem personalizētajiem produktiem. Atlaide netiek piemērota gatavajiem dizainiem no sadaļas <span className="font-semibold">"Mūsu kolekcija"</span>.
        </p>
      )}
    </div>
  );
};

const Tier = ({
  qty,
  pct,
  emoji,
  highlight,
}: {
  qty: string;
  pct: string;
  emoji: string;
  highlight?: boolean;
}) => (
  <div
    className={`text-center rounded-lg border-2 px-2 py-2 font-body transition-transform hover:scale-105 ${
      highlight
        ? "border-cta-red bg-cta-red/10 shadow-[0_0_20px_hsl(var(--cta-red)/0.25)]"
        : "border-cta-red/40 bg-background"
    }`}
  >
    <div className="text-sm leading-none mb-1">{emoji}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
      {qty}
    </div>
    <div
      className={`text-base font-extrabold ${
        highlight ? "text-cta-red" : "text-foreground"
      }`}
    >
      {pct}
    </div>
  </div>
);
