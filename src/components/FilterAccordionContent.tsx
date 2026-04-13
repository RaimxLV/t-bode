import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "./CategoryIcons";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ProductFiltersState } from "@/hooks/useProductFilters";
import type { DBProduct } from "@/hooks/useProducts";

interface CategoryDef {
  id: string;
  key: string;
}

interface FilterAccordionContentProps {
  categories: CategoryDef[];
  products: DBProduct[];
  filters: ProductFiltersState;
  setFilter: (key: string, value: string | string[] | number | null) => void;
}

/* ───────────── colour helpers ───────────── */

interface ColorGroup {
  name: string;
  /** representative hex (first encountered) */
  displayHex: string;
  /** every hex value across all products for this colour name */
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

/* ───────────── size helpers ───────────── */

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
      // Baby: anything with "months" or starts with "0-"
      baby.push(size);
    } else if (/gadi/i.test(size) || /^\d+-\d+\/\d+/i.test(size)) {
      // Kids: contains "gadi" or pattern like "3-4/98-104cm", "5-6/110-116cm"
      kids.push(size);
    } else {
      // Other: 300ml, 450ml, One Size, shoe sizes (35-38, etc.)
      other.push(size);
    }
  }

  adults.sort((a, b) => {
    const ai = adultOrder.indexOf(a.toUpperCase());
    const bi = adultOrder.indexOf(b.toUpperCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Sort baby by extracting first number
  baby.sort((a, b) => {
    const na = parseInt(a) || 0;
    const nb = parseInt(b) || 0;
    return na - nb;
  });

  // Sort kids by extracting age/cm number
  kids.sort((a, b) => {
    const na = parseInt(a) || 0;
    const nb = parseInt(b) || 0;
    return na - nb;
  });

  return { adults, kids, baby, other };
}

/* ───────────── component ───────────── */

export const FilterAccordionContent = ({
  categories,
  products,
  filters,
  setFilter,
}: FilterAccordionContentProps) => {
  const { t } = useTranslation();
  const [showAllColors, setShowAllColors] = useState(false);

  const colorGroups = buildColorGroups(products);
  const MAX_VISIBLE = 14;
  const visibleColors = showAllColors ? colorGroups : colorGroups.slice(0, MAX_VISIBLE);
  const hiddenCount = colorGroups.length - MAX_VISIBLE;

  const allSizes = Array.from(new Set(products.flatMap((p) => p.sizes || [])));
  const { adults, kids, baby, other } = classifySizes(allSizes);

  const prices = products.map((p) => p.price);
  const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 100;

  /* colour toggle – adds/removes ALL hexes belonging to a colour name */
  const toggleColorGroup = (group: ColorGroup) => {
    const current = filters.colors;
    const isSelected = group.allHexes.some((h) => current.includes(h));
    const next = isSelected
      ? current.filter((c) => !group.allHexes.includes(c))
      : [...current, ...group.allHexes.filter((h) => !current.includes(h))];
    setFilter("colors", next);
  };

  const isColorGroupSelected = (group: ColorGroup) =>
    group.allHexes.some((h) => filters.colors.includes(h));

  const toggleSize = (size: string) => {
    const current = filters.sizes;
    const next = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];
    setFilter("sizes", next);
  };

  const renderSizeButtons = (sizes: string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((size) => {
        const isSelected = filters.sizes.includes(size);
        return (
          <button
            key={size}
            onClick={() => toggleSize(size)}
            className={`min-w-[40px] h-9 px-2.5 text-xs font-body font-medium rounded-lg border transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-foreground/30"
            }`}
          >
            {size}
          </button>
        );
      })}
    </div>
  );

  const sizeGroups: { key: string; label: string; sizes: string[] }[] = [
    { key: "adults", label: t("filters.sizeAdults"), sizes: adults },
    { key: "kids", label: t("filters.sizeKids"), sizes: kids },
    { key: "baby", label: t("filters.sizeBaby"), sizes: baby },
    { key: "other", label: t("filters.sizeOther"), sizes: other },
  ].filter((g) => g.sizes.length > 0);

  return (
    <Accordion type="multiple" defaultValue={["category"]} className="w-full">
      {/* Category */}
      <AccordionItem value="category">
        <AccordionTrigger className="text-sm font-body font-semibold uppercase tracking-wider">
          {t("admin.category")}
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.all;
              const isActive = filters.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilter("category", cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-body font-medium transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                  {t(cat.key)}
                </button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Colors – grouped by name */}
      {colorGroups.length > 0 && (
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-body font-semibold uppercase tracking-wider">
            {t("productDetail.color")}
            {filters.colors.length > 0 && (
              <span className="ml-2 text-xs text-primary font-normal">
                ({colorGroups.filter(isColorGroupSelected).length})
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-7 gap-1.5">
              {visibleColors.map((group) => {
                const selected = isColorGroupSelected(group);
                return (
                  <button
                    key={group.name}
                    onClick={() => toggleColorGroup(group)}
                    title={group.name}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        selected
                          ? "border-primary ring-2 ring-primary/30 scale-110"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: group.displayHex }}
                    />
                    <span className="text-[9px] text-muted-foreground truncate max-w-[44px] leading-tight">
                      {group.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {hiddenCount > 0 && !showAllColors && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllColors(true)}
                className="mt-2 text-xs text-primary w-full"
              >
                +{hiddenCount} {t("productDetail.color").toLowerCase()}
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Sizes – 4 sub-groups inside nested accordion */}
      {allSizes.length > 0 && (
        <AccordionItem value="sizes">
          <AccordionTrigger className="text-sm font-body font-semibold uppercase tracking-wider">
            {t("productDetail.size")}
            {filters.sizes.length > 0 && (
              <span className="ml-2 text-xs text-primary font-normal">({filters.sizes.length})</span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            {sizeGroups.length === 1 ? (
              renderSizeButtons(sizeGroups[0].sizes)
            ) : (
              <Accordion type="multiple" defaultValue={[sizeGroups[0]?.key]} className="w-full">
                {sizeGroups.map((group) => (
                  <AccordionItem key={group.key} value={group.key} className="border-b-0">
                    <AccordionTrigger className="text-xs font-body font-medium py-2 text-muted-foreground hover:text-foreground">
                      {group.label}
                      <span className="ml-1 text-[10px] opacity-60">({group.sizes.length})</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      {renderSizeButtons(group.sizes)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Price range */}
      {maxPrice > minPrice && (
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-body font-semibold uppercase tracking-wider">
            {t("admin.price")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-3">
              <Slider
                min={minPrice}
                max={maxPrice}
                step={1}
                value={[filters.priceMin ?? minPrice, filters.priceMax ?? maxPrice]}
                onValueChange={([min, max]) => {
                  setFilter("priceMin", min === minPrice ? null : min);
                  setFilter("priceMax", max === maxPrice ? null : max);
                }}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={filters.priceMin ?? minPrice}
                  onChange={(e) =>
                    setFilter("priceMin", e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-20 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  value={filters.priceMax ?? maxPrice}
                  onChange={(e) =>
                    setFilter("priceMax", e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-20 h-8 text-xs"
                />
                <span className="text-xs font-medium text-muted-foreground">€</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
};
