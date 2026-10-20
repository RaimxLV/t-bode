import { motion } from "framer-motion";
import { Phone, Mail, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { stores } from "@/data/products";
import { lazy, Suspense } from "react";
import { DeferredWork } from "./DeferredWork";
const LeafletMap = lazy(() => import("./OfficeMap"));

export const StoresSection = () => {
  const { t } = useTranslation();

  return (
    <section id="stores" className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-3xl md:text-5xl mb-3 md:mb-4">{t("stores.title")}</h2>
          <p className="text-muted-foreground font-body text-sm md:text-base">{t("stores.subtitle")}</p>
        </motion.div>

        {/* Store cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
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
              <img src={store.image} alt={store.name} className="w-full h-28 md:h-48 object-cover" loading="lazy" />
              <div className="p-3 md:p-5">
                <h3 className="font-body font-bold text-sm md:text-lg mb-2 md:mb-3 truncate">{store.name}</h3>
                <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground font-body">
                  <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 md:gap-2 hover:text-foreground transition-colors">
                    <Phone className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span className="truncate">{store.phone}</span>
                  </a>
                  <a href={`mailto:${store.email}`} className="flex items-center gap-1.5 md:gap-2 hover:text-foreground transition-colors">
                    <Mail className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span className="truncate text-[11px] md:text-sm">{store.email}</span>
                  </a>
                  <div className="flex items-center gap-1.5 md:gap-2 text-primary font-body">
                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span className="text-[11px] md:text-sm whitespace-nowrap">{t("stores.hours")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Office location */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 md:mt-12"
        >
          <h3 className="text-lg md:text-2xl mb-3 md:mb-4 text-center uppercase tracking-wide">
            {t("stores.officeTitle", "Atrašanās vieta kartē")}
          </h3>

          {/* Light Leaflet map */}
          <div className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden border border-border relative" style={{ zIndex: 0 }}>
            <DeferredWork className="w-full h-full">
              <Suspense fallback={null}>
                <LeafletMap infoText={t("stores.mapInfo", "Braslas Biznesa Centrs, Entrance D, 2nd floor")} />
              </Suspense>
            </DeferredWork>
          </div>

          {/* Pickup info */}
          <p className="text-center text-sm md:text-base text-muted-foreground font-body mt-4 md:mt-6 px-4">
            {t("stores.pickup", "Pasūtījumus var saņemt personīgi T‑Bode birojā Rīgā, Braslas ielā 29, D ieeja.")}
          </p>

          {/* Navigation buttons – white bg, grey border, colored icons */}
          <div className="flex flex-col gap-3 mt-4 md:mt-6 max-w-lg mx-auto px-2">
            <a
              href="https://waze.com/ul?ll=56.961710,24.166054&navigate=yes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg py-4 px-6 font-body font-bold text-sm md:text-base text-black hover:bg-gray-50 transition-colors uppercase tracking-wider"
            >
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="6" fill="#33CCFF"/>
                <path d="M12 4C9.24 4 7 6.24 7 9c0 1.2.34 2.3.95 3.3l3.4 5.4c.34.54 1.16.54 1.5 0l3.4-5.4c.6-1 .95-2.1.95-3.3 0-2.76-2.24-5-5-5z" fill="white"/>
                <circle cx="12" cy="9" r="2" fill="#33CCFF"/>
              </svg>
              {t("stores.openWaze", "ATVĒRT WAZE")}
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=56.961710,24.166054"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg py-4 px-6 font-body font-bold text-sm md:text-base text-black hover:bg-gray-50 transition-colors uppercase tracking-wider"
            >
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#EA4335"/>
              </svg>
              {t("stores.openGoogleMaps", "ATVĒRT GOOGLE MAPS")}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
