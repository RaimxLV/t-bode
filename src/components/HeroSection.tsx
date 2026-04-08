import { motion } from "framer-motion";
import heroImage from "@/assets/hero.jpg";

export const HeroSection = () => {
  return (
    <section className="relative h-screen overflow-hidden">
      {/* Parallax Background */}
      <div
        className="absolute inset-0 parallax-bg"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-overlay)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center h-full container mx-auto px-4">
        <div className="max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl lg:text-9xl leading-none tracking-tight"
          >
            Design.
            <br />
            Print.
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl leading-none mt-2 text-gradient-brand"
          >
            Tell Your Story.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-8 bg-background/30 backdrop-blur-sm rounded-lg p-6 max-w-md"
          >
            <h3 className="text-xl font-semibold mb-2 font-body">
              Your Idea. Your Shirt.
            </h3>
            <p className="text-muted-foreground text-sm mb-4 font-body">
              Custom Apparel for Every Adventure.
            </p>
            <a
              href="#products"
              className="inline-block px-8 py-3 rounded-md font-body font-semibold text-sm transition-all hover:scale-105"
              style={{ background: "var(--gradient-brand)", color: "white" }}
            >
              Make it Personal
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
