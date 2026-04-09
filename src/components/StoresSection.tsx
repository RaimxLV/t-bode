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
          className="mt-12 bg-card rounded-lg overflow-hidden border border-border relative"
          style={{ boxShadow: "var(--shadow-card)", isolation: "isolate", zIndex: 0 }}
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

              {/* Navigation buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <a
                  href="https://waze.com/ul?ll=56.9496,24.1830&navigate=yes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border border-border rounded-lg py-3 px-4 font-body font-bold text-sm hover:bg-secondary/50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63c.69 1.34 1.07 2.87 1.07 4.49 0 4.41-2.79 8.12-6.67 9.33-.25.08-.51-.12-.51-.38v-.71c0-.26.18-.49.43-.56 3.19-1.05 5.5-4.13 5.5-7.68 0-1.35-.32-2.62-.88-3.74a.544.544 0 0 1 .09-.6l.47-.47c.17-.17.45-.14.5.12zm-3.06-3.16c.17-.17.14-.45-.12-.5C16.02 2.28 14.55 1.9 12.93 1.9c-5.14 0-9.31 4.17-9.31 9.31 0 2.24.79 4.29 2.1 5.9.16.2.14.49-.05.65l-.47.47c-.17.17-.45.14-.6-.06A9.26 9.26 0 0 1 2.37 11.2C2.37 5.34 7.07.64 12.93.64c1.89 0 3.66.5 5.19 1.36.2.11.23.38.09.56l-.47.47c-.11.11-.28.15-.43.09-.01 0-.02-.01-.03-.01zM12 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>
                  {t("stores.openWaze", "ATVĒRT WAZE")}
                </a>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=56.9496,24.1830"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border border-border rounded-lg py-3 px-4 font-body font-bold text-sm hover:bg-secondary/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                  {t("stores.openGoogleMaps", "ATVĒRT GOOGLE MAPS")}
                </a>
              </div>
            </div>
            <div
              className="h-64 md:h-auto min-h-[280px] relative group cursor-pointer z-0"
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
