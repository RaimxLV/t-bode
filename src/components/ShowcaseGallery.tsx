import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { buildSrcSet, getOptimizedSrc, isSupabaseImage } from "@/lib/imageOptimization";

interface ShowcaseGalleryProps {
  images: string[];
  productName: string;
}

/**
 * "Mūsu darbi" — gallery of real printed customer orders.
 * Visually distinct from the Lifestyle (catalog) gallery: dark studio backdrop,
 * horizontal snap rail of slightly tilted polaroid-style cards.
 */
export const ShowcaseGallery = ({ images, productName }: ShowcaseGalleryProps) => {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="mt-20 lg:mt-28 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="relative bg-foreground text-background py-12 lg:py-16 overflow-hidden">
        {/* subtle backdrop texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cta-red/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6 mb-8 lg:mb-10">
            <div>
              <p className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-cta-red font-body mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {t("productDetail.showcaseEyebrow", "Reāli pasūtījumi")}
              </p>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight leading-none">
                {t("productDetail.showcaseTitle", "Mūsu darbi")}
              </h2>
              <p className="mt-3 text-sm md:text-base text-background/70 font-body max-w-md">
                {t(
                  "productDetail.showcaseSubtitle",
                  "Dizaini, ko esam apdrukājuši mūsu klientiem. Iedvesmai."
                )}
              </p>
            </div>
            {images.length > 2 && (
              <div className="hidden md:flex gap-2 shrink-0">
                <button
                  onClick={() => scroll(-1)}
                  aria-label="Iepriekšējais"
                  className="w-11 h-11 rounded-full border border-background/20 hover:border-background/60 hover:bg-background/10 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scroll(1)}
                  aria-label="Nākamais"
                  className="w-11 h-11 rounded-full border border-background/20 hover:border-background/60 hover:bg-background/10 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={railRef}
            className="flex gap-5 md:gap-7 overflow-x-auto snap-x snap-mandatory pb-6 pt-4 -mx-1 px-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((img, idx) => {
              const optimized = isSupabaseImage(img) ? getOptimizedSrc(img, 900, 85) : img;
              const srcSet = buildSrcSet(img, [500, 800, 1100], 85) || undefined;
              // Alternating subtle tilt for polaroid feel
              const tilt = idx % 4 === 0 ? "-rotate-2" : idx % 4 === 1 ? "rotate-1" : idx % 4 === 2 ? "-rotate-1" : "rotate-2";
              return (
                <motion.button
                  key={idx}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => { setActiveIdx(idx); setLightboxOpen(true); }}
                  className={`group relative shrink-0 snap-start ${tilt} hover:rotate-0 transition-transform duration-500`}
                  aria-label={`${productName} — apdrukāts darbs ${idx + 1}`}
                >
                  <div className="bg-background p-3 pb-12 shadow-2xl shadow-black/40 rounded-sm w-[230px] sm:w-[260px] md:w-[280px]">
                    <div className="relative w-full aspect-square overflow-hidden bg-muted">
                      <img
                        src={optimized}
                        srcSet={srcSet}
                        sizes="(max-width: 768px) 70vw, 280px"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="font-display text-xs tracking-[0.2em] uppercase text-foreground/50">
                        T-Bode · {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
            {/* trailing spacer */}
            <div className="shrink-0 w-1" aria-hidden />
          </div>
        </div>
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