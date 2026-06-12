import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildSrcSet, getOptimizedSrc, isSupabaseImage } from "@/lib/imageOptimization";

interface GalleryItem {
  src: string;
  altLv: string;
  altEn: string;
}

const galleryImages: GalleryItem[] = [
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20260210-WA0025-scaled.jpg",
    altLv: "T-Bode personalizēts t-krekls ar DTF apdruku",
    altEn: "T-Bode custom t-shirt with DTF print",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20260210-WA0017-scaled.jpg",
    altLv: "Hūdijs ar individuālu dizainu no T-Bode",
    altEn: "Hoodie with custom design by T-Bode",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20260210-WA0019-scaled.jpg",
    altLv: "Krūze ar krāsainu apdruku Rīgā",
    altEn: "Mug with colorful print made in Riga",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20260210-WA0013-scaled.jpg",
    altLv: "Kokvilnas soma ar T-Bode dizaina apdruku",
    altEn: "Cotton tote bag with T-Bode design print",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20260210-WA0021-scaled.jpg",
    altLv: "Komandas t-krekli ar logo apdruku",
    altEn: "Team t-shirts with logo print",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20251209-WA0009-scaled.jpg",
    altLv: "Bērnu t-krekls ar krāsainu DTF apdruku",
    altEn: "Kids t-shirt with colorful DTF print",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20251209-WA0003-scaled.jpg",
    altLv: "Melns hūdijs ar lielizmēra apdruku",
    altEn: "Black hoodie with oversized print",
  },
  {
    src: "https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/product-images/wp/2026/02/IMG-20260210-WA0011-scaled.jpg",
    altLv: "T-Bode apģērbu apdrukas darbu paraugs",
    altEn: "Sample of T-Bode apparel printing work",
  },
];

const GalleryImage = ({ src, alt }: { src: string; alt: string }) => {
  const [error, setError] = useState(false);

  if (error) return null;

  const optimized = isSupabaseImage(src) ? getOptimizedSrc(src, 512, 75) : src;
  const srcSet = buildSrcSet(src, [256, 384, 512, 640], 75) || undefined;

  return (
    <motion.img
      src={optimized}
      srcSet={srcSet}
      sizes={srcSet ? "(max-width: 768px) 192px, 256px" : undefined}
      alt={alt}
      className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-lg flex-shrink-0 bg-muted"
      loading="lazy"
      decoding="async"
      whileHover={{ scale: 1.05 }}
      onError={() => setError(true)}
    />
  );
};

export const GallerySection = () => {
  const { i18n } = useTranslation();
  const isLv = (i18n.language || "lv") === "lv";
  const heading = isLv
    ? "Mūsu darbi — T-Bode personalizētas apdrukas piemēri"
    : "Our work — examples of T-Bode custom prints";

  return (
    <section className="py-16 overflow-hidden" aria-labelledby="gallery-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8 text-center">
        <h2 id="gallery-heading" className="font-display text-3xl md:text-4xl tracking-tight">
          {heading}
        </h2>
      </div>
      <div className="flex gap-4 animate-[scroll_30s_linear_infinite]" style={{ width: "max-content" }}>
        {[...galleryImages, ...galleryImages].map((img, i) => (
          <GalleryImage key={i} src={img.src} alt={isLv ? img.altLv : img.altEn} />
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};
