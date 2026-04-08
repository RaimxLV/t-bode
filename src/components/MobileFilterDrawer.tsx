import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterAccordionContent } from "./FilterAccordionContent";
import type { ProductFiltersState } from "@/hooks/useProductFilters";
import type { DBProduct } from "@/hooks/useProducts";

interface CategoryDef {
  id: string;
  key: string;
}

interface MobileFilterDrawerProps {
  categories: CategoryDef[];
  products: DBProduct[];
  filters: ProductFiltersState;
  setFilter: (key: string, value: string | string[] | number | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
}

export const MobileFilterDrawer = ({
  categories,
  products,
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  filteredCount,
}: MobileFilterDrawerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.category !== "all",
    filters.colors.length > 0,
    filters.sizes.length > 0,
    filters.priceMin !== null,
    filters.priceMax !== null,
  ].filter(Boolean).length;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 h-11"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t("filters.filter")}
        {activeCount > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="text-lg font-display">{t("filters.filter")}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FilterAccordionContent
              categories={categories}
              products={products}
              filters={filters}
              setFilter={setFilter}
            />
          </div>

          {/* Sticky bottom actions */}
          <div className="border-t border-border p-4 flex gap-3 bg-background">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex-1"
              >
                {t("filters.clearAll")}
              </Button>
            )}
            <Button
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              {t("filters.showResults", { count: filteredCount })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
