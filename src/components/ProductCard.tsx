import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import type { DBProduct } from "@/hooks/useProducts";

export const ProductCard = ({ product }: { product: DBProduct }) => {
  const { t } = useTranslation();
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);

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

  // Re-attach listener when emblaApi changes
  useMemo(() => {
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
      className="group bg-card rounded-xl overflow-hidden border border-border hover:border-foreground/20 transition-all shadow-sm hover:shadow-md"
    >
      {/* Image carousel */}
      <div className="relative aspect-square overflow-hidden">
        <div ref={emblaRef} className="overflow-hidden h-full">
          <div className="flex h-full">
            {displayImages.map((img, i) => (
              <Link
                key={i}
                to={`/product/${product.slug}`}
                className="min-w-0 shrink-0 grow-0 basis-full h-full"
              >
                <img
                  src={img}
                  alt={`${product.name} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Nav arrows – visible on hover (desktop) or always (mobile with multiple) */}
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

        {/* Dot indicators */}
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
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-4">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-body font-semibold text-xs sm:text-sm mb-1.5 line-clamp-2 leading-tight">
            {product.name}
          </h3>
        </Link>

        {/* Color swatches */}
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
              {product.customizable ? t("products.customize") : t("products.selectOptions")}
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
