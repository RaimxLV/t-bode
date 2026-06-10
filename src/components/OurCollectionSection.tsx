import { useMemo } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { useCollectionProducts } from "@/hooks/useProducts";
import { useProductFilters } from "@/hooks/useProductFilters";
import { useActiveCollectionCampaigns } from "@/hooks/useActiveCollectionCampaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCategories, buildCategoryFilterList, getCategorySlugsIncludingChildren } from "@/hooks/useCategories";

export const OurCollectionSection = () => {
  const { data: products = [], isLoading } = useCollectionProducts();
  const { data: allCategories = [] } = useCategories();
  const { data: activeCampaigns = [] } = useActiveCollectionCampaigns();
  const { filters, setFilter, clearFilters, hasActiveFilters } = useProductFilters();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  // Build dynamic category list from DB (only categories that have collection products)
  const categoryKeys = useMemo(() => {
    const allKeys = buildCategoryFilterList(allCategories, "categories.allCollection");
    const productCats = new Set(products.map((p) => p.category));
    return allKeys.filter((ck) => {
      if (ck.id === "all") return true;
      const matchSlugs = getCategorySlugsIncludingChildren(allCategories, ck.id);
      return matchSlugs.some((s) => productCats.has(s));
    });
  }, [allCategories, products]);

  // Collection chips: only campaigns that have at least 1 product in the collection feed,
  // plus a synthetic "base" chip for products without a campaign, plus "all".
  const collectionChips = useMemo(() => {
    const countsByCampaign = new Map<string, number>();
    let baseCount = 0;
    for (const p of products) {
      const cid = (p as any).campaign_id as string | null;
      if (cid) countsByCampaign.set(cid, (countsByCampaign.get(cid) ?? 0) + 1);
      else baseCount += 1;
    }
    const chips: { id: string; label: string; count: number }[] = [];
    chips.push({ id: "all", label: t("filters.allCollections"), count: products.length });
    if (baseCount > 0) {
      chips.push({ id: "base", label: t("filters.baseCollection"), count: baseCount });
    }
    for (const c of activeCampaigns) {
      const count = countsByCampaign.get(c.id) ?? 0;
      if (count > 0) chips.push({ id: c.id, label: c.title, count });
    }
    return chips;
  }, [products, activeCampaigns, t]);

  const filtered = useMemo(() => {
    const matchSlugs = filters.category !== "all"
      ? getCategorySlugsIncludingChildren(allCategories, filters.category)
      : null;

    return products.filter((p) => {
      if (matchSlugs && !matchSlugs.includes(p.category)) return false;
      if (filters.campaign !== "all") {
        const cid = (p as any).campaign_id as string | null;
        if (filters.campaign === "base") {
          if (cid) return false;
        } else {
          if (cid !== filters.campaign) return false;
        }
      }
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
  }, [products, filters, allCategories]);

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

        {/* Collection chips — only render when more than the default "all" chip exists */}
        {collectionChips.length > 2 && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {collectionChips.map((chip) => {
              const active = filters.campaign === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFilter("campaign", chip.id === "all" ? "all" : chip.id)}
                  className={`px-4 py-2 rounded-full text-sm font-body font-medium transition-all border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {chip.label}
                  <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "opacity-60"}`}>
                    ({chip.count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isMobile ? (
          <>
            <ProductFilters
              categories={categoryKeys}
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
                categories={categoryKeys}
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
