import { motion } from "framer-motion";
import { Palette, Zap, Package, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export const AboutSection = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Palette, titleKey: "about.features.quality.title", descKey: "about.features.quality.desc" },
    { icon: Zap, titleKey: "about.features.tool.title", descKey: "about.features.tool.desc" },
    { icon: Package, titleKey: "about.features.production.title", descKey: "about.features.production.desc" },
    { icon: Truck, titleKey: "about.features.delivery.title", descKey: "about.features.delivery.desc" },
  ];


  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-16 px-5 sm:px-4"
        >
          <h2 className="text-4xl md:text-5xl mb-6">{t("about.title")}</h2>
          <p
            className="text-muted-foreground leading-relaxed font-body text-left sm:text-center max-w-[34rem] mx-auto"
            dangerouslySetInnerHTML={{ __html: t("about.description") }}
          />
          {/* DTF sadaļa pagaidām paslēpta — atjaunot, kad /kas-ir-dtf lapa gatava
          <div className="mt-8 flex justify-center">
            <Link
              to="/kas-ir-dtf"
              className="inline-flex items-center justify-center rounded-md border border-foreground/30 bg-transparent px-6 py-3 font-body text-sm font-semibold uppercase tracking-wider text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              Kas ir DTF?
            </Link>
          </div>
          */}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-lg p-6 border border-border hover:border-primary/40 transition-colors"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <f.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-body font-semibold mb-2">{t(f.titleKey)}</h3>
              <p className="text-sm text-muted-foreground font-body">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
