import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
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
    <section className="mt-16 lg:mt-20">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-cta-red" />
        <span className="text-xs font-body font-bold uppercase tracking-wider text-cta-red">
          {t("productDetail.lifestyleEyebrow", "Galerija")}
        </span>
      </div>
      <h2 className="font-display text-2xl md:text-3xl tracking-wide mb-1">
        {t("productDetail.lifestyleTitle", "Kā izskatās dabā")}
      </h2>
      <p className="text-sm text-muted-foreground font-body mb-6">
        {t("productDetail.lifestyleSubtitle", "Reāli foto ar produktu — uzklikšķini, lai apskatītos tuvāk.")}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {images.map((img, idx) => {
          const optimized = isSupabaseImage(img) ? getOptimizedSrc(img, 800, 80) : img;
          const srcSet = buildSrcSet(img, [400, 600, 800, 1000], 80) || undefined;
          return (
            <motion.button
              key={idx}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
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
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
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