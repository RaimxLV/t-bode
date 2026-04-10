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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;border-radius:50%;background:#DC2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    L.marker([OFFICE_LAT, OFFICE_LNG], { icon })
      .addTo(map)
      .bindPopup(
        `<div style="text-align:center;font-family:Inter,sans-serif;font-size:13px">
          <strong style="font-size:14px">T-Bode birojs</strong><br/>
          Braslas iela 29, Rīga<br/>
          <span style="color:#DC2626">Ieeja D</span>
        </div>`
      );

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
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

        {/* Office location with Leaflet map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 md:mt-12"
        >
          <h3 className="text-lg md:text-2xl mb-3 md:mb-4 text-center uppercase tracking-wide">
            {t("stores.officeTitle", "Atrašanās vieta kartē")}
          </h3>

          {/* Leaflet dark map */}
          <div className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden border border-border">
            <LeafletMap />
          </div>

          {/* Pickup info */}
          <p className="text-center text-sm md:text-base text-muted-foreground font-body mt-4 md:mt-6 px-4">
            {t("stores.pickup", "Pasūtījumus var saņemt personīgi T-Bode birojā Rīgā, Braslas ielā 29, D ieeja.")}
          </p>

          {/* Navigation buttons */}
          <div className="flex flex-col gap-3 mt-4 md:mt-6 max-w-lg mx-auto">
            <a
              href="https://waze.com/ul?q=Braslas%20iela%2029%20Riga&ll=56.9534,24.1625&navigate=yes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-border rounded-lg py-3.5 md:py-4 px-4 font-body font-bold text-sm md:text-base hover:bg-secondary/50 transition-colors uppercase tracking-wide"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63c.69 1.34 1.07 2.87 1.07 4.49 0 4.41-2.79 8.12-6.67 9.33-.25.08-.51-.12-.51-.38v-.71c0-.26.18-.49.43-.56 3.19-1.05 5.5-4.13 5.5-7.68 0-1.35-.32-2.62-.88-3.74a.544.544 0 0 1 .09-.6l.47-.47c.17-.17.45-.14.5.12zm-3.06-3.16c.17-.17.14-.45-.12-.5C16.02 2.28 14.55 1.9 12.93 1.9c-5.14 0-9.31 4.17-9.31 9.31 0 2.24.79 4.29 2.1 5.9.16.2.14.49-.05.65l-.47.47c-.17.17-.45.14-.6-.06A9.26 9.26 0 0 1 2.37 11.2C2.37 5.34 7.07.64 12.93.64c1.89 0 3.66.5 5.19 1.36.2.11.23.38.09.56l-.47.47c-.11.11-.28.15-.43.09-.01 0-.02-.01-.03-.01zM12 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>
              {t("stores.openWaze", "Atvērt Waze")}
            </a>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Braslas+iela+29+Rīga+D+ieeja"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-border rounded-lg py-3.5 md:py-4 px-4 font-body font-bold text-sm md:text-base hover:bg-secondary/50 transition-colors uppercase tracking-wide"
            >
              <Navigation className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />
              {t("stores.openGoogleMaps", "Atvērt Google Maps")}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
