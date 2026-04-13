import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { FilterAccordionContent } from "./FilterAccordionContent";
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

  // Desktop: accordion-based sidebar layout
  return (
    <div className="space-y-4">
      <FilterAccordionContent
        categories={categories}
        products={products}
        filters={filters}
        setFilter={setFilter}
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3 mr-1" />
          {t("admin.clearFilters")}
        </Button>
      )}
    </div>
  );
};
