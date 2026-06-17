import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Expand } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { buildSrcSet, getOptimizedSrc, isSupabaseImage } from "@/lib/imageOptimization";

interface LifestyleGalleryProps {
  images: string[];
  productName: string;
}

export const LifestyleGallery = ({ images, productName }: LifestyleGalleryProps) => {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <section className="mt-20 lg:mt-28">
      <div className="mb-8 lg:mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body mb-2">
          {t("productDetail.lifestyleEyebrow", "Galerija")}
        </p>
        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight leading-none">
          {t("productDetail.lifestyleTitle", "Kā izskatās dabā")}
        </h2>
        <div className="mt-3 h-[2px] w-10 bg-foreground/40 rounded-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {images.map((img, idx) => {
          const optimized = isSupabaseImage(img) ? getOptimizedSrc(img, 900, 82) : img;
          const srcSet = buildSrcSet(img, [400, 600, 900, 1200], 82) || undefined;
          // Subtle staggered aspect ratios for a more dynamic, editorial feel
          const aspect =
            idx % 5 === 0 ? "aspect-[4/5]"
            : idx % 5 === 2 ? "aspect-square"
            : idx % 5 === 4 ? "aspect-[5/6]"
            : "aspect-[3/4]";
          return (
            <motion.button
              key={idx}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: Math.min(idx * 0.04, 0.32), ease: [0.22, 1, 0.36, 1] }}
              onClick={() => { setActiveIdx(idx); setLightboxOpen(true); }}
              className={`group relative ${aspect} overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 hover:ring-foreground/40 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-0.5`}
              aria-label={productName}
            >
              <img
                src={optimized}
                srcSet={srcSet}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
              />
              {/* Gradient veil */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Expand icon */}
              <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg">
                <Expand className="w-4 h-4 text-foreground" />
              </div>
              {/* Bottom accent bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-cta-red scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
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