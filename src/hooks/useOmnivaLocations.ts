import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OmnivaLocation {
  ZIP: string;
  NAME: string;
  TYPE: string;
  A0_NAME: string;
  A1_NAME: string;
  A2_NAME: string;
  A5_NAME: string;
  A7_NAME: string;
  X_COORDINATE: string;
  Y_COORDINATE: string;
}

export const useOmnivaLocations = () => {
  const [locations, setLocations] = useState<OmnivaLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("omniva-locations");
        if (error) throw error;
        const list = (data as OmnivaLocation[]) || [];
        const latvian = list.filter((loc) => loc.A0_NAME === "LV" && loc.TYPE === "0");
        if (!cancelled) setLocations(latvian);
      } catch {
        // Fallback: try direct fetch (might fail due to CORS, but worth a shot)
        try {
          const res = await fetch("https://www.omniva.lv/locations.json");
          const data: OmnivaLocation[] = await res.json();
          const latvian = data.filter((loc) => loc.A0_NAME === "LV" && loc.TYPE === "0");
          if (!cancelled) setLocations(latvian);
        } catch {
          if (!cancelled) setLocations([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { locations, loading };
};
