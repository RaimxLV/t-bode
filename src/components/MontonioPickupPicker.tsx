import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface MontonioPickupPoint {
  id: string;
  name: string;
  address?: string;
  city?: string;
  countryCode?: string;
  carrierCode?: string;
}

interface Props {
  selectedId: string;
  onSelect: (point: MontonioPickupPoint) => void;
}

/**
 * Loads pickup points from Montonio Shipping V2 (parcel machines / pakomāti)
 * via the `montonio-shipping-methods` edge function. Filters to LV by default
 * and presents a searchable list. The `id` returned by Montonio is what gets
 * sent back when creating the order.
 */
export const MontonioPickupPicker = ({ selectedId, onSelect }: Props) => {
  const { t } = useTranslation();
  const [points, setPoints] = useState<MontonioPickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("montonio-shipping-methods");
        if (error) throw error;

        // Montonio returns a structure like:
        // { items: [ { carrierCode, countryCode, pickupPoints: [{ id, name, address, ... }] } ] }
        // Be defensive about variations.
        const flat: MontonioPickupPoint[] = [];
        const items = (data?.items ?? data?.data ?? data ?? []) as any[];
        const pushPoint = (p: any, carrierCode?: string, countryCode?: string) => {
          const id = p?.id ?? p?.pickupPointId ?? p?.code;
          const name = p?.name ?? p?.publicName ?? p?.title;
          if (!id || !name) return;
          flat.push({
            id: String(id),
            name: String(name),
            address: p?.address ?? p?.streetAddress,
            city: p?.city ?? p?.locality,
            countryCode: p?.countryCode ?? countryCode,
            carrierCode: p?.carrierCode ?? carrierCode,
          });
        };

        if (Array.isArray(items)) {
          for (const it of items) {
            if (it?.pickupPoints && Array.isArray(it.pickupPoints)) {
              for (const p of it.pickupPoints) pushPoint(p, it.carrierCode, it.countryCode);
            } else {
              pushPoint(it);
            }
          }
        }

        // Prefer LV first
        flat.sort((a, b) => {
          if ((a.countryCode === "LV") !== (b.countryCode === "LV")) {
            return a.countryCode === "LV" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        if (!cancelled) setPoints(flat);
      } catch (e: any) {
        console.error("Montonio pickup load failed:", e);
        toast.error(t("checkout.montonioPickupLoadError", "Neizdevās ielādēt Montonio pakomātus"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return points;
    return points.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q),
    );
  }, [points, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("checkout.montonioPickupSearch", "Meklēt pakomātu (pilsēta vai adrese)")}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="font-body text-sm">
            {t("checkout.montonioPickupLoading", "Ielādē pakomātus...")}
          </span>
        </div>
      ) : (
        <ScrollArea className="h-72 rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {filtered.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground font-body text-center">
                {t("checkout.montonioPickupEmpty", "Nav rezultātu")}
              </li>
            )}
            {filtered.map((p) => {
              const active = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className={`w-full text-left p-3 flex items-start gap-3 hover:bg-muted transition-colors ${
                      active ? "bg-primary/5" : ""
                    }`}
                  >
                    <MapPin
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: active ? "hsl(var(--primary))" : undefined }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-body font-semibold truncate">{p.name}</p>
                      {(p.address || p.city) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[p.address, p.city, p.countryCode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
};