import { motion } from "framer-motion";

const galleryImages = [
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0025-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0017-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0019-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0013-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0021-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20251209-WA0009-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20251209-WA0003-scaled-500x500.jpg",
  "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/IMG-20260210-WA0011-scaled-500x500.jpg",
];

export const GallerySection = () => {
  return (
    <section className="py-16 overflow-hidden">
      <div className="flex gap-4 animate-[scroll_30s_linear_infinite]" style={{ width: "max-content" }}>
        {[...galleryImages, ...galleryImages].map((img, i) => (
          <motion.img
            key={i}
            src={img}
            alt={`Gallery ${i + 1}`}
            className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-lg flex-shrink-0"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
          />
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
