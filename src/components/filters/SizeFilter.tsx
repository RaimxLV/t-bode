import { useTranslation } from "react-i18next";
import { Ruler, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { DBProduct } from "@/hooks/useProducts";

interface SizeGroups {
  adults: string[];
  kids: string[];
  baby: string[];
  other: string[];
}

function classifySizes(sizes: string[]): SizeGroups {
  const adultOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];
  const adults: string[] = [];
  const kids: string[] = [];
  const baby: string[] = [];
  const other: string[] = [];

  for (const size of sizes) {
    const upper = size.toUpperCase();
    if (adultOrder.includes(upper)) {
      adults.push(size);
    } else if (/month/i.test(size) || /^0-/i.test(size)) {
      baby.push(size);
    } else if (/gadi/i.test(size) || /^\d+-\d+\/\d+/i.test(size)) {
      kids.push(size);
    } else {
      other.push(size);
    }
  }

  adults.sort((a, b) => {
    const ai = adultOrder.indexOf(a.toUpperCase());
    const bi = adultOrder.indexOf(b.toUpperCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  baby.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  kids.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

  return { adults, kids, baby, other };
}

interface SizeFilterProps {
  products: DBProduct[];
  selectedSizes: string[];
  onChange: (sizes: string[]) => void;
}

export const SizeFilter = ({ products, selectedSizes, onChange }: SizeFilterProps) => {
  const { t } = useTranslation();
  const allSizes = Array.from(new Set(products.flatMap((p) => p.sizes || [])));
  const { adults, kids, baby, other } = classifySizes(allSizes);

  const toggle = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    onChange(next);
  };

  const groups = [
    { key: "adults", label: t("filters.sizeAdults"), sizes: adults },
    { key: "kids", label: t("filters.sizeKids"), sizes: kids },
    { key: "baby", label: t("filters.sizeBaby"), sizes: baby },
    { key: "other", label: t("filters.sizeOther"), sizes: other },
  ].filter((g) => g.sizes.length > 0);

  if (allSizes.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-10 font-body text-sm"
        >
          <span className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            {t("productDetail.size")}
          </span>
          {selectedSizes.length > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedSizes.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.sizes.map((size) => {
                  const active = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggle(size)}
                      className={`min-w-[36px] h-8 px-2 text-[11px] font-body font-medium rounded-md border transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-foreground/30"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
