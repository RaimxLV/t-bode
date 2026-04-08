import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/data/products";

export const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link to={`/product/${product.slug}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group bg-card rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-all cursor-pointer"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="aspect-square overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <h3 className="font-body font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold font-body">
              {product.price.toFixed(2).replace(".", ",")} €
            </span>
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold font-body text-primary-foreground transition-all hover:scale-105"
              style={{ background: "var(--gradient-brand)" }}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Select options
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
