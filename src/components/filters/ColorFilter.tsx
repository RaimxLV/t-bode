import { useTranslation } from "react-i18next";
import { Paintbrush, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { DBProduct } from "@/hooks/useProducts";

interface ColorGroup {
  name: string;
  displayHex: string;
  allHexes: string[];
}

function buildColorGroups(products: DBProduct[]): ColorGroup[] {
  const map = new Map<string, { displayHex: string; hexes: Set<string> }>();

  for (const p of products) {
    for (const c of p.color_variants || []) {
      if (!c.hex || !c.name) continue;
      const key = c.name.trim().toLowerCase();
      const entry = map.get(key);
      if (entry) {
        entry.hexes.add(c.hex.toLowerCase());
      } else {
        map.set(key, {
          displayHex: c.hex,
          hexes: new Set([c.hex.toLowerCase()]),
        });
      }
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, v]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      displayHex: v.displayHex,
      allHexes: Array.from(v.hexes),
    }));
}

interface ColorFilterProps {
  products: DBProduct[];
  selectedColors: string[];
  onChange: (colors: string[]) => void;
}

export const ColorFilter = ({ products, selectedColors, onChange }: ColorFilterProps) => {
  const { t } = useTranslation();
  const colorGroups = buildColorGroups(products);

  const isSelected = (group: ColorGroup) =>
    group.allHexes.some((h) => selectedColors.includes(h));

  const toggle = (group: ColorGroup) => {
    const selected = isSelected(group);
    const next = selected
      ? selectedColors.filter((c) => !group.allHexes.includes(c))
      : [...selectedColors, ...group.allHexes.filter((h) => !selectedColors.includes(h))];
    onChange(next);
  };

  const selectedCount = colorGroups.filter(isSelected).length;

  if (colorGroups.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-10 font-body text-sm"
        >
          <span className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-muted-foreground" />
            {t("productDetail.color")}
          </span>
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-2 gap-1">
          {colorGroups.map((group) => {
            const active = isSelected(group);
            return (
              <button
                key={group.name}
                onClick={() => toggle(group)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-body transition-all text-left ${
                  active
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    active ? "border-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: group.displayHex }}
                >
                  {active && (
                    <Check className="w-3 h-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                  )}
                </span>
                <span className="truncate">{group.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
