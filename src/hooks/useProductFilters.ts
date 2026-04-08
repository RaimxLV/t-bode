import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

export interface ProductFiltersState {
  category: string;
  colors: string[];
  sizes: string[];
  priceMin: number | null;
  priceMax: number | null;
}

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ProductFiltersState = useMemo(() => ({
    category: searchParams.get("category") || "all",
    colors: searchParams.get("colors")?.split(",").filter(Boolean) || [],
    sizes: searchParams.get("sizes")?.split(",").filter(Boolean) || [],
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
  }), [searchParams]);

  const setFilter = useCallback((key: string, value: string | string[] | number | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === "all" || (Array.isArray(value) && value.length === 0)) {
        next.delete(key);
      } else if (Array.isArray(value)) {
        next.set(key, value.join(","));
      } else {
        next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = filters.category !== "all" || filters.colors.length > 0 || filters.sizes.length > 0 || filters.priceMin !== null || filters.priceMax !== null;

  return { filters, setFilter, clearFilters, hasActiveFilters };
}
