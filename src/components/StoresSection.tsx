import { motion } from "framer-motion";
import { MapPin, Phone, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { stores } from "@/data/products";

export const StoresSection = () => {
  const { t } = useTranslation();

  return (
    <section id="stores" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl mb-4">{t("stores.title")}</h2>
          <p className="text-muted-foreground font-body">{t("stores.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stores.map((store, i) => (
            <motion.div
              key={store.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-lg overflow-hidden border border-border"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <img src={store.image} alt={store.name} className="w-full h-48 object-cover" loading="lazy" />
              <div className="p-5">
                <h3 className="font-body font-bold text-lg mb-3">{store.name}</h3>
                <div className="space-y-2 text-sm text-muted-foreground font-body">
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />{store.phone}</div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{store.email}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8 text-sm text-muted-foreground font-body flex items-center justify-center gap-2"
        >
          <MapPin className="w-4 h-4 text-primary" />
          {t("stores.pickup")}
        </motion.div>
      </div>
    </section>
  );
};
