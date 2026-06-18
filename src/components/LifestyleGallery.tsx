import { useState } from "react";
import { motion } from "framer-motion";
import { ImageLightbox } from "@/components/ImageLightbox";
import { buildSrcSet, getOptimizedSrc, isSupabaseImage } from "@/lib/imageOptimization";

interface LifestyleGalleryProps {
  images: string[];
  productName: string;
}

export const LifestyleGallery = ({ images, productName }: LifestyleGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <section className="mt-16 lg:mt-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {images.map((img, idx) => {
          const optimized = isSupabaseImage(img) ? getOptimizedSrc(img, 900, 85) : img;
          const srcSet = buildSrcSet(img, [400, 600, 900, 1200], 85) || undefined;
          const isDetailImage = idx >= 2;
          return (
            <motion.button
              key={idx}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
              onClick={() => { setActiveIdx(idx); setLightboxOpen(true); }}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-muted border border-border hover:border-foreground/30 transition-all shadow-sm hover:shadow-lg"
              aria-label={`${productName} — ${idx + 1}`}
            >
              <img
                src={optimized}
                srcSet={srcSet}
                sizes="(max-width: 768px) 50vw, 33vw"
                alt={`${productName} ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className={`block w-full h-full object-cover transition-transform duration-500 ${
                  isDetailImage
                    ? "scale-[1.38] group-hover:scale-[1.42]"
                    : "group-hover:scale-[1.03]"
                }`}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </motion.button>
          );
        })}
      </div>

      <ImageLightbox
        images={images}
        initialIndex={activeIdx}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={productName}
      />
    </section>
  );
};