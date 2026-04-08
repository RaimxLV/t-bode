import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { FilterAccordionContent } from "./FilterAccordionContent";
import { CATEGORY_ICONS } from "./CategoryIcons";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ProductFiltersState } from "@/hooks/useProductFilters";
import type { DBProduct } from "@/hooks/useProducts";

interface CategoryDef {
  id: string;
  key: string;
}

interface ProductFiltersProps {
  categories: CategoryDef[];
  products: DBProduct[];
  filters: ProductFiltersState;
  setFilter: (key: string, value: string | string[] | number | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount?: number;
}

export const ProductFilters = ({
  categories,
  products,
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  filteredCount = 0,
}: ProductFiltersProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileFilterDrawer
        categories={categories}
        products={products}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredCount}
      />
    );
  }

  // Desktop: keep the existing inline layout
  const availableColors = Array.from(
    new Map(
      products
        .flatMap((p) => p.color_variants || [])
        .filter((c) => c.hex && c.name)
        .map((c) => [c.hex.toLowerCase(), c] as const)
    ).values()
  );

  const availableSizes = Array.from(
    new Set(products.flatMap((p) => p.sizes || []))
  );

  const sizeOrder = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  availableSizes.sort((a, b) => {
    const ai = sizeOrder.indexOf(a);
    const bi = sizeOrder.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

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

  return (
    <div className="space-y-6">
      {/* Categories with icons */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.all;
          const isActive = filters.category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter("category", cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-body font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
              }`}
            >
              <Icon size={18} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
              {t(cat.key)}
            </button>
          );
        })}
      </div>

      {/* Attribute filters row */}
      <div className="flex flex-wrap items-start gap-6 p-4 bg-card rounded-lg border border-border">
        {availableColors.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider">
              {t("productDetail.color")}
            </span>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((c) => {
                const isSelected = filters.colors.includes(c.hex.toLowerCase());
                return (
                  <button
                    key={c.hex}
                    onClick={() => toggleColor(c.hex)}
                    title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {availableSizes.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider">
              {t("productDetail.size")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableSizes.map((size) => {
                const isSelected = filters.sizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => toggleSize(size)}
                    className={`min-w-[36px] h-9 px-2 text-xs font-body font-medium rounded border transition-all ${
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
          </div>
        )}

        {maxPrice > minPrice && (
          <div className="space-y-2 min-w-[200px]">
            <span className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider">
              {t("admin.price")}
            </span>
            <div className="pt-1">
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
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={filters.priceMin ?? minPrice}
                  onChange={(e) => setFilter("priceMin", e.target.value ? Number(e.target.value) : null)}
                  className="w-20 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  value={filters.priceMax ?? maxPrice}
                  onChange={(e) => setFilter("priceMax", e.target.value ? Number(e.target.value) : null)}
                  className="w-20 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">€</span>
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-end pb-1">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
              <X className="w-3 h-3 mr-1" />
              {t("admin.clearFilters")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
