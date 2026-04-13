import { useMemo } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { useCollectionProducts } from "@/hooks/useProducts";
import { useProductFilters } from "@/hooks/useProductFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

const COLLECTION_CATEGORY_KEYS = [
  { id: "all", key: "categories.allCollection" },
  { id: "latvia", key: "categories.latvia" },
  { id: "accessories", key: "categories.accessories" },
];

export const OurCollectionSection = () => {
  const { data: products = [], isLoading } = useCollectionProducts();
  const { filters, setFilter, clearFilters, hasActiveFilters } = useProductFilters();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.category !== "all" && p.category !== filters.category) return false;
      if (filters.colors.length > 0) {
        const productColors = (p.color_variants || []).map((c) => c.hex.toLowerCase());
        if (!filters.colors.some((c) => productColors.includes(c))) return false;
      }
      if (filters.sizes.length > 0) {
        const productSizes = p.sizes || [];
        if (!filters.sizes.some((s) => productSizes.includes(s))) return false;
      }
      if (filters.priceMin !== null && p.price < filters.priceMin) return false;
      if (filters.priceMax !== null && p.price > filters.priceMax) return false;
      return true;
    });
  }, [products, filters]);

  if (!isLoading && products.length === 0) return null;

  const gridContent = isLoading ? (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg overflow-hidden border border-border">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3 sm:p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ) : filtered.length === 0 ? (
    <div className="text-center py-20">
      <p className="text-muted-foreground font-body">{t("products.noProducts")}</p>
    </div>
  ) : (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      {filtered.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );

  return (
    <section id="collection" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl text-center mb-4"
        >
          {t("products.collectionTitle")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-center mb-12 max-w-xl mx-auto font-body"
        >
          {t("products.collectionDesc")}
        </motion.p>

        {isMobile ? (
          <>
            <ProductFilters
              categories={COLLECTION_CATEGORY_KEYS}
              products={products}
              filters={filters}
              setFilter={setFilter}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              filteredCount={filtered.length}
            />
            <div className="mt-8">{gridContent}</div>
          </>
        ) : (
          <div className="flex gap-8">
            <aside className="w-56 shrink-0">
              <ProductFilters
                categories={COLLECTION_CATEGORY_KEYS}
                products={products}
                filters={filters}
                setFilter={setFilter}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                filteredCount={filtered.length}
              />
            </aside>
            <div className="flex-1 min-w-0">{gridContent}</div>
          </div>
        )}
      </div>
    </section>
  );
};
