import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { CategoryFilter } from "./filters/CategoryFilter";
import { ColorFilter } from "./filters/ColorFilter";
import { SizeFilter } from "./filters/SizeFilter";
import { PriceFilter } from "./filters/PriceFilter";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal } from "lucide-react";
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

  // Desktop: vertical sidebar
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-xs font-body font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {t("admin.category")}
        </h3>
        <CategoryFilter
          categories={categories}
          selected={filters.category}
          onChange={(id) => setFilter("category", id)}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Color dropdown */}
      <ColorFilter
        products={products}
        selectedColors={filters.colors}
        onChange={(colors) => setFilter("colors", colors)}
      />

      {/* Size dropdown */}
      <SizeFilter
        products={products}
        selectedSizes={filters.sizes}
        onChange={(sizes) => setFilter("sizes", sizes)}
      />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Price */}
      <PriceFilter
        products={products}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onChange={setFilter}
      />

      {/* Clear */}
      {hasActiveFilters && (
        <>
          <div className="border-t border-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            {t("admin.clearFilters")}
          </Button>
        </>
      )}
    </div>
  );
};
