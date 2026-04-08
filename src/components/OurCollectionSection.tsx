import { useState } from "react";
import { motion } from "framer-motion";
import { products, collectionCategories } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";

export const OurCollectionSection = () => {
  const [active, setActive] = useState("all");

  const collectionProducts = products.filter((p) => !p.customizable);
  const filtered =
    active === "all"
      ? collectionProducts
      : collectionProducts.filter((p) => p.category === active);

  if (collectionProducts.length === 0) return null;

  return (
    <section id="collection" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl text-center mb-4"
        >
          Our Collection
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-center mb-12 max-w-xl mx-auto font-body"
        >
          Ready-made designs inspired by Latvia — grab your favourite and go.
        </motion.p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {collectionCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-body font-medium transition-all ${
                active === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
