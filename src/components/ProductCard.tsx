import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import type { DBProduct } from "@/hooks/useProducts";
import { getProductName } from "@/hooks/useProducts";
import { WishlistButton } from "@/components/WishlistButton";
import { buildSrcSet, getOptimizedSrc, isSupabaseImage } from "@/lib/imageOptimization";

const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const optimized = isSupabaseImage(src) ? getOptimizedSrc(src, 640, 75) : src;
  const srcSet = buildSrcSet(src, [320, 480, 640, 800], 75) || undefined;
  return (
    <div className="relative w-full h-full bg-muted">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
      )}
      <img
        src={optimized}
        srcSet={srcSet}
        sizes={srcSet ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" : undefined}
        alt={alt}
        className={`w-full h-full object-contain bg-white transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

interface ProductCardProps {
  product: DBProduct;
  onEdit?: (product: DBProduct) => void;
  onDelete?: (productId: string) => void;
}

export const ProductCard = ({ product, onEdit, onDelete }: ProductCardProps) => {
  const { t, i18n } = useTranslation();
  const displayName = getProductName(product, i18n.language);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const isAdmin = !!(onEdit || onDelete);

  const allImages = useMemo(() => {
    const imgs: string[] = [];
    if (product.image_url) imgs.push(product.image_url);
    product.color_variants?.forEach((cv) => {
      cv.images?.forEach((img) => {
        if (!imgs.includes(img)) imgs.push(img);
      });
    });
    return imgs.length > 0 ? imgs : ["/placeholder.svg"];
  }, [product]);

  const displayImages = useMemo(() => {
    if (selectedColorIdx !== null && product.color_variants?.[selectedColorIdx]?.images?.length) {
      return product.color_variants[selectedColorIdx].images;
    }
    return allImages;
  }, [selectedColorIdx, product.color_variants, allImages]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [currentSlide, setCurrentSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const hasMultipleImages = displayImages.length > 1;
  const hasColors = product.color_variants && product.color_variants.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group flex flex-col h-full bg-card rounded-xl overflow-hidden border border-border hover:border-foreground/20 transition-all shadow-sm hover:shadow-md"
    >
      {/* Image — aspect-square, overflow-hidden, rounded top */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl flex-shrink-0 bg-white">
        <div ref={emblaRef} className="overflow-hidden w-full h-full">
          <div className="flex h-full">
            {displayImages.map((img, i) => (
              <Link
                key={i}
                to={`/product/${product.slug}`}
                className="relative flex-[0_0_100%] min-w-0 h-full"
              >
                <ProductImage src={img} alt={`${displayName} ${i + 1}`} />
              </Link>
            ))}
          </div>
        </div>

        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); emblaApi?.scrollPrev(); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Previous"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); emblaApi?.scrollNext(); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {hasMultipleImages && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {displayImages.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentSlide ? "bg-white scale-125" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {!product.in_stock && (
          <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold font-body px-2 py-0.5 rounded">
            {t("products.outOfStock", "Nav noliktavā")}
          </div>
        )}

        {/* Wishlist heart top-right */}
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton productId={product.id} size="sm" variant="floating" />
        </div>
      </div>

      {/* Content — flex-1 pushes bottom block down */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-4">
        {/* Name + colors — grows to fill */}
        <div className="flex-1 min-h-0">
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-body font-semibold text-xs sm:text-sm mb-1.5 line-clamp-2 leading-tight">
              {displayName}
            </h3>
          </Link>

          {hasColors && (
            <div className="flex flex-wrap gap-1 mb-2">
              {product.color_variants.map((cv, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedColorIdx(selectedColorIdx === i ? null : i)}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all ${
                    selectedColorIdx === i
                      ? "border-foreground scale-110"
                      : "border-border hover:border-foreground/50"
                  }`}
                  style={{ backgroundColor: cv.hex }}
                  title={cv.name}
                  aria-label={cv.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom — always at bottom via mt-auto */}
        <div className="mt-auto space-y-1.5">
          {/* Price + cart */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm sm:text-lg font-bold font-body">
              {product.price.toFixed(2).replace(".", ",")} €
            </span>
            <Link
              to={`/product/${product.slug}`}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-semibold font-body text-white transition-all hover:scale-105 bg-cta-red"
            >
              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">
                {t("products.selectOptions")}
              </span>
            </Link>
          </div>

          {/* Customize button */}
          {product.customizable && (
            <Link
              to={`/product/${product.slug}`}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-semibold font-body border-2 border-cta-red text-cta-red hover:bg-cta-red hover:text-white transition-all"
            >
              {t("products.customize")}
            </Link>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-1 pt-1 border-t border-border">
              {onEdit && (
                <button
                  onClick={(e) => { e.preventDefault(); onEdit(product); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-body text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("admin.edit", "Rediģēt")}</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.preventDefault(); onDelete(product.id); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-body text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("admin.delete", "Dzēst")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
