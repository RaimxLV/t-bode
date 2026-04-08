import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";
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
                  <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Phone className="w-4 h-4 text-primary" />{store.phone}
                  </a>
                  <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Mail className="w-4 h-4 text-primary" />{store.email}
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Office location with Google Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 bg-card rounded-lg overflow-hidden border border-border"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-body font-bold text-lg">{t("stores.officeTitle")}</h3>
              </div>
              <p className="text-muted-foreground font-body text-sm leading-relaxed mb-4">
                {t("stores.officeDesc")}
              </p>
              <div className="space-y-2 text-sm text-muted-foreground font-body">
                <p className="font-medium text-foreground">Braslas iela 29, Ieeja D, Rīga, LV-1084</p>
                <a href="tel:+37125486124" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Phone className="w-4 h-4 text-primary" />+371 25 486 124
                </a>
                <a href="mailto:info@t-bode.lv" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Mail className="w-4 h-4 text-primary" />info@t-bode.lv
                </a>
              </div>
            </div>
            <div
              className="h-64 md:h-auto min-h-[280px] relative group cursor-pointer"
              onClick={(e) => {
                const iframe = e.currentTarget.querySelector('iframe');
                if (iframe) iframe.style.pointerEvents = 'auto';
              }}
              onMouseLeave={(e) => {
                const iframe = e.currentTarget.querySelector('iframe');
                if (iframe) iframe.style.pointerEvents = 'none';
              }}
            >
              <iframe
                title="T-Bode Office"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2175.5!2d24.1830!3d56.9496!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x46eecfb7e3a0b0c1%3A0x8f0e4d3c2b1a0987!2sBraslas+iela+29%2C+Latgales+priek%C5%A1pils%C4%93ta%2C+R%C4%ABga%2C+LV-1084!5e0!3m2!1slv!2slv!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0, pointerEvents: 'none' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-r-lg">
                <span className="text-white text-sm font-body bg-black/60 px-3 py-1.5 rounded-full">
                  {t("stores.clickToInteract", "Klikšķini, lai pārvietotos kartē")}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

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
