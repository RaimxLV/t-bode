import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OFFICE_LAT = 56.961710;
const OFFICE_LNG = 24.166054;

const LeafletMap = ({ infoText }: { infoText: string }) => {
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
          <div style="font-size:12px;color:#bbb;margin-left:18px;">${infoText}</div>
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
  }, [infoText]);

  return <div ref={mapRef} className="w-full h-full" style={{ zIndex: 0 }} />;
};

export default LeafletMap;
