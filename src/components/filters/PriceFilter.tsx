import { useTranslation } from "react-i18next";
import { Euro } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { DBProduct } from "@/hooks/useProducts";

interface PriceFilterProps {
  products: DBProduct[];
  priceMin: number | null;
  priceMax: number | null;
  onChange: (key: string, value: number | null) => void;
}

export const PriceFilter = ({ products, priceMin, priceMax, onChange }: PriceFilterProps) => {
  const { t } = useTranslation();
  const prices = products.map((p) => p.price);
  const min = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const max = prices.length ? Math.ceil(Math.max(...prices)) : 100;

  if (max <= min) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-body font-medium text-muted-foreground">
        <Euro className="w-4 h-4" />
        {t("admin.price")}
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[priceMin ?? min, priceMax ?? max]}
        onValueChange={([lo, hi]) => {
          onChange("priceMin", lo === min ? null : lo);
          onChange("priceMax", hi === max ? null : hi);
        }}
        className="w-full"
      />
      <div className="flex items-center justify-between text-xs font-body text-muted-foreground">
        <span>€{priceMin ?? min}</span>
        <span>€{priceMax ?? max}</span>
      </div>
    </div>
  );
};
