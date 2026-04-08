import { useState, useEffect } from "react";

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
    fetch("https://www.omniva.lv/locations.json")
      .then((res) => res.json())
      .then((data: OmnivaLocation[]) => {
        const latvian = data.filter(
          (loc) => loc.A0_NAME === "LV" && loc.TYPE === "0"
        );
        setLocations(latvian);
      })
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  return { locations, loading };
};
