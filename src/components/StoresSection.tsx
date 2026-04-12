import { motion } from "framer-motion";
import { Phone, Mail, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { stores } from "@/data/products";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OFFICE_LAT = 56.9534;
const OFFICE_LNG = 24.1625;

const LeafletMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [OFFICE_LAT, OFFICE_LNG],
      zoom: 16,
      scrollWheelZoom: false,
    });

    // Light/standard map style like Ervitex reference
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Orange circle marker (like Ervitex pin)
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;border-radius:50%;background:#F97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white"/><circle cx="12" cy="9" r="2.5" fill="#F97316"/></svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([OFFICE_LAT, OFFICE_LNG], { icon }).addTo(map);

    // Custom control: dark info box in bottom-left (Ervitex style)
    const InfoControl = L.Control.extend({
      options: { position: "bottomleft" as L.ControlPosition },
      onAdd: function () {
        const div = L.DomUtil.create("div");
        div.innerHTML = `<div style="
          background:rgba(0,0,0,0.88);
          color:white;
          padding:12px 16px;
          border-radius:4px;
          font-family:Inter,sans-serif;
          min-width:200px;
          max-width:260px;
          pointer-events:none;
        ">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <div style="width:10px;height:10px;border-radius:50%;background:#DC2626;flex-shrink:0;"></div>
            <strong style="font-size:14px;letter-spacing:0.5px;">T-BODE</strong>
          </div>
          <div style="font-size:12px;color:#bbb;margin-left:18px;">Braslas Biznesa Centrs, Braslas iela 29</div>
        </div>`;
        return div;
      },
    });
    new InfoControl().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" style={{ zIndex: 0 }} />;
};

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
            <LeafletMap />
          </div>

          {/* Pickup info */}
          <p className="text-center text-sm md:text-base text-muted-foreground font-body mt-4 md:mt-6 px-4">
            {t("stores.pickup", "Pasūtījumus var saņemt personīgi T-Bode birojā Rīgā, Braslas ielā 29, D ieeja.")}
          </p>

          {/* Navigation buttons – white bg, grey border, colored icons */}
          <div className="flex flex-col gap-3 mt-4 md:mt-6 max-w-lg mx-auto px-2">
            <a
              href="https://waze.com/ul?q=Braslas%20iela%2029%20Riga&ll=56.9534,24.1625&navigate=yes"
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
              href="https://www.google.com/maps/dir/?api=1&destination=Braslas+iela+29+Rīga+D+ieeja"
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
