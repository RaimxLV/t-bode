import { useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { useCollectionProducts } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

const COLLECTION_CATEGORY_KEYS = [
  { id: "all", key: "categories.allCollection" },
  { id: "latvia", key: "categories.latvia" },
  { id: "accessories", key: "categories.accessories" },
];

export const OurCollectionSection = () => {
  const [active, setActive] = useState("all");
  const { data: products = [], isLoading } = useCollectionProducts();
  const { t } = useTranslation();

  const filtered = active === "all" ? products : products.filter((p) => p.category === active);

  if (!isLoading && products.length === 0) return null;

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

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {COLLECTION_CATEGORY_KEYS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-body font-medium transition-all ${
                active === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {t(cat.key)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
