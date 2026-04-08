import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "./CategoryIcons";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const MAX_VISIBLE_COLORS = 12;

// Size group classification
function classifySizes(sizes: string[]) {
  const adultSizes = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const adults: string[] = [];
  const kids: string[] = [];
  const baby: string[] = [];

  const adultOrder = adultSizes;

  for (const size of sizes) {
    const upper = size.toUpperCase();
    if (adultSizes.includes(upper)) {
      adults.push(size);
    } else if (/month/i.test(size) || /^0-/i.test(size)) {
      baby.push(size);
    } else {
      kids.push(size);
    }
  }

  adults.sort((a, b) => {
    const ai = adultOrder.indexOf(a.toUpperCase());
    const bi = adultOrder.indexOf(b.toUpperCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return { adults, kids, baby };
}

export const FilterAccordionContent = ({
  categories,
  products,
  filters,
  setFilter,
}: FilterAccordionContentProps) => {
  const { t } = useTranslation();
  const [showAllColors, setShowAllColors] = useState(false);

  // Derive available colors
  const availableColors = Array.from(
    new Map(
      products
        .flatMap((p) => p.color_variants || [])
        .filter((c) => c.hex && c.name)
        .map((c) => [c.hex.toLowerCase(), c] as const)
    ).values()
  );

  // Derive available sizes
  const availableSizes = Array.from(
    new Set(products.flatMap((p) => p.sizes || []))
  );

  const { adults, kids, baby } = classifySizes(availableSizes);
  const hasMultipleGroups = [adults.length > 0, kids.length > 0, baby.length > 0].filter(Boolean).length > 1;

  // Price range
  const prices = products.map((p) => p.price);
  const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 100;

  const toggleColor = (hex: string) => {
    const lower = hex.toLowerCase();
    const current = filters.colors;
    const next = current.includes(lower)
      ? current.filter((c) => c !== lower)
      : [...current, lower];
    setFilter("colors", next);
  };

  const toggleSize = (size: string) => {
    const current = filters.sizes;
    const next = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];
    setFilter("sizes", next);
  };

  const visibleColors = showAllColors ? availableColors : availableColors.slice(0, MAX_VISIBLE_COLORS);
  const hiddenColorCount = availableColors.length - MAX_VISIBLE_COLORS;

  const renderSizeButtons = (sizes: string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((size) => {
        const isSelected = filters.sizes.includes(size);
        return (
          <button
            key={size}
            onClick={() => toggleSize(size)}
            className={`min-w-[40px] h-10 px-3 text-sm font-body font-medium rounded-lg border transition-all ${
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

      {/* Colors */}
      {availableColors.length > 0 && (
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-body font-semibold uppercase tracking-wider">
            {t("productDetail.color")}
            {filters.colors.length > 0 && (
              <span className="ml-2 text-xs text-primary font-normal">({filters.colors.length})</span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-6 gap-2">
              {visibleColors.map((c) => {
                const isSelected = filters.colors.includes(c.hex.toLowerCase());
                return (
                  <button
                    key={c.hex}
                    onClick={() => toggleColor(c.hex)}
                    title={c.name}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={`w-9 h-9 rounded-full border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 scale-110"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] text-muted-foreground truncate max-w-[48px]">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {hiddenColorCount > 0 && !showAllColors && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllColors(true)}
                className="mt-3 text-xs text-primary w-full"
              >
                {t("filters.showAllColors", { count: hiddenColorCount })}
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Sizes */}
      {availableSizes.length > 0 && (
        <AccordionItem value="sizes">
          <AccordionTrigger className="text-sm font-body font-semibold uppercase tracking-wider">
            {t("productDetail.size")}
            {filters.sizes.length > 0 && (
              <span className="ml-2 text-xs text-primary font-normal">({filters.sizes.length})</span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            {hasMultipleGroups ? (
              <Tabs defaultValue="adults" className="w-full">
                <TabsList className="w-full mb-3">
                  {adults.length > 0 && <TabsTrigger value="adults" className="flex-1 text-xs">{t("filters.sizeAdults")}</TabsTrigger>}
                  {kids.length > 0 && <TabsTrigger value="kids" className="flex-1 text-xs">{t("filters.sizeKids")}</TabsTrigger>}
                  {baby.length > 0 && <TabsTrigger value="baby" className="flex-1 text-xs">{t("filters.sizeBaby")}</TabsTrigger>}
                </TabsList>
                {adults.length > 0 && <TabsContent value="adults">{renderSizeButtons(adults)}</TabsContent>}
                {kids.length > 0 && <TabsContent value="kids">{renderSizeButtons(kids)}</TabsContent>}
                {baby.length > 0 && <TabsContent value="baby">{renderSizeButtons(baby)}</TabsContent>}
              </Tabs>
            ) : (
              renderSizeButtons(availableSizes)
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
            <div className="pt-2">
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
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="number"
                  value={filters.priceMin ?? minPrice}
                  onChange={(e) => setFilter("priceMin", e.target.value ? Number(e.target.value) : null)}
                  className="w-20 h-9 text-sm"
                />
                <span className="text-sm text-muted-foreground">–</span>
                <Input
                  type="number"
                  value={filters.priceMax ?? maxPrice}
                  onChange={(e) => setFilter("priceMax", e.target.value ? Number(e.target.value) : null)}
                  className="w-20 h-9 text-sm"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
};
