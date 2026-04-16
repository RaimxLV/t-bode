import { motion } from "framer-motion";
import { useState } from "react";

const galleryImages = [
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0025-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0017-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0019-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0013-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0021-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20251209-WA0009-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20251209-WA0003-scaled.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0011-scaled.jpg",
];

const GalleryImage = ({ src, index }: { src: string; index: number }) => {
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <motion.img
      src={src}
      alt={`Gallery ${index + 1}`}
      className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-lg flex-shrink-0 bg-muted"
      loading="lazy"
      whileHover={{ scale: 1.05 }}
      onError={() => setError(true)}
    />
  );
};

export const GallerySection = () => {
  return (
    <section className="py-16 overflow-hidden">
      <div className="flex gap-4 animate-[scroll_30s_linear_infinite]" style={{ width: "max-content" }}>
        {[...galleryImages, ...galleryImages].map((img, i) => (
          <GalleryImage key={i} src={img} index={i} />
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
