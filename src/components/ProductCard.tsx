import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { DBProduct } from "@/hooks/useProducts";

export const ProductCard = ({ product }: { product: DBProduct }) => {
  const { t } = useTranslation();

  return (
    <Link to={`/product/${product.slug}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group bg-card rounded-lg overflow-hidden border border-border hover:border-foreground/20 transition-all cursor-pointer"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="aspect-square overflow-hidden">
          <img
            src={product.image_url || "/placeholder.svg"}
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
            <span className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold font-body text-white transition-all hover:scale-105 bg-cta-red">
              <ShoppingCart className="w-3.5 h-3.5" />
              {product.customizable ? t("products.customize") : t("products.selectOptions")}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
