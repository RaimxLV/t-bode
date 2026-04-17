import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Search, Crosshair, MapPin, List, Map as MapIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import type { OmnivaLocation } from "@/hooks/useOmnivaLocations";
import { toast } from "sonner";

// Fix default marker icons (Leaflet + bundlers issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const selectedIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [0, -42],
  className: "hue-rotate-[120deg] saturate-200",
});

interface Props {
  locations: OmnivaLocation[];
  loading: boolean;
  selectedName: string;
  onSelect: (loc: OmnivaLocation) => void;
}

// Latvia center
const DEFAULT_CENTER: [number, number] = [56.95, 24.1];
const DEFAULT_ZOOM = 7;

function FlyTo({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const OmnivaMapPicker = ({ locations, loading, selectedName, onSelect }: Props) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [flyCenter, setFlyCenter] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState(DEFAULT_ZOOM);
  const [locating, setLocating] = useState(false);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  // Parse coords once
  const points = useMemo(
    () =>
      locations
        .map((loc) => {
          const lat = parseFloat(loc.Y_COORDINATE);
          const lng = parseFloat(loc.X_COORDINATE);
          return Number.isFinite(lat) && Number.isFinite(lng) ? { loc, lat, lng } : null;
        })
        .filter((x): x is { loc: OmnivaLocation; lat: number; lng: number } => x !== null),
    [locations],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return points;
    const q = search.toLowerCase();
    return points.filter(
      (p) =>
        p.loc.NAME.toLowerCase().includes(q) ||
        p.loc.A1_NAME?.toLowerCase().includes(q) ||
        p.loc.A5_NAME?.toLowerCase().includes(q) ||
        p.loc.ZIP?.includes(q),
    );
  }, [points, search]);

  const findNearest = () => {
    if (!navigator.geolocation) {
      toast.error(t("checkout.geoUnsupported", "Pārlūks neatbalsta ģeolokāciju"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        let nearest = points[0];
        let best = Infinity;
        for (const p of points) {
          const d = haversine(me, [p.lat, p.lng]);
          if (d < best) {
            best = d;
            nearest = p;
          }
        }
        if (nearest) {
          setFlyCenter([nearest.lat, nearest.lng]);
          setFlyZoom(14);
          onSelect(nearest.loc);
          setView("map");
          setTimeout(() => {
            const m = markerRefs.current[nearest.loc.ZIP];
            m?.openPopup();
          }, 900);
          toast.success(t("checkout.nearestFound", "Atrasts tuvākais pakomāts"));
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? t("checkout.geoPermissionDenied", "Lūdzu atļaujiet piekļuvi atrašanās vietai")
            : t("checkout.geoError", "Neizdevās noteikt atrašanās vietu"),
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSelect = (p: { loc: OmnivaLocation; lat: number; lng: number }) => {
    onSelect(p.loc);
    setFlyCenter([p.lat, p.lng]);
    setFlyZoom(15);
    setView("map");
    setTimeout(() => markerRefs.current[p.loc.ZIP]?.openPopup(), 900);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("checkout.searchOmniva", "Meklēt pēc nosaukuma vai pilsētas")}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={findNearest}
            disabled={locating || loading}
            className="gap-2"
          >
            <Crosshair className={`w-4 h-4 ${locating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t("checkout.findNearest", "Tuvākais")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setView(view === "map" ? "list" : "map")}
            className="gap-2"
            aria-label={view === "map" ? t("checkout.showList", "Saraksts") : t("checkout.showMap", "Karte")}
          >
            {view === "map" ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {view === "map" ? t("checkout.showList", "Saraksts") : t("checkout.showMap", "Karte")}
            </span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-[360px] flex items-center justify-center border border-border rounded-md bg-muted/30">
          <p className="text-sm text-muted-foreground font-body">{t("checkout.loadingOmniva", "Ielādē pakomātus...")}</p>
        </div>
      ) : view === "map" ? (
        <div className="h-[360px] rounded-md overflow-hidden border border-border">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo center={flyCenter} zoom={flyZoom} />
            {filtered.map((p) => {
              const isSelected = p.loc.NAME === selectedName;
              return (
                <Marker
                  key={p.loc.ZIP}
                  position={[p.lat, p.lng]}
                  icon={isSelected ? selectedIcon : new L.Icon.Default()}
                  ref={(ref) => {
                    if (ref) markerRefs.current[p.loc.ZIP] = ref;
                  }}
                  eventHandlers={{
                    click: () => onSelect(p.loc),
                  }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[180px]">
                      <p className="font-semibold">{p.loc.NAME}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.loc.A5_NAME}, {p.loc.A1_NAME}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => onSelect(p.loc)}
                      >
                        {isSelected
                          ? t("checkout.selected", "Izvēlēts") + " ✓"
                          : t("checkout.selectThis", "Izvēlēties šo")}
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <ScrollArea className="h-[360px] border border-border rounded-md">
          <div className="p-2 flex flex-col gap-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2 font-body">{t("checkout.notFound", "Nav atrasts")}</p>
            ) : (
              filtered.slice(0, 100).map((p) => (
                <button
                  type="button"
                  key={p.loc.ZIP}
                  onClick={() => handleSelect(p)}
                  className={`text-left p-2 rounded text-sm font-body transition-colors ${
                    selectedName === p.loc.NAME ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                  }`}
                >
                  <span className="font-semibold">{p.loc.NAME}</span>
                  <span className="text-xs text-muted-foreground block">
                    {p.loc.A5_NAME}, {p.loc.A1_NAME}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {selectedName && (
        <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          {t("checkout.selected", "Izvēlēts")}: <span className="font-semibold text-foreground">{selectedName}</span>
        </p>
      )}
    </div>
  );
};
