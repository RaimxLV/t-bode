import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExistingColor {
  name: string;
  hex: string;
}

/**
 * Aggregates unique colors (by lowercased hex) from all products' color_variants.
 * Used in admin product dialog to let admins pick from previously-used colors
 * instead of re-entering the same color repeatedly.
 */
export function useExistingColors() {
  return useQuery({
    queryKey: ["existing-colors"],
    queryFn: async (): Promise<ExistingColor[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("color_variants");
      if (error) throw error;

      // Dedupe by lowercased trimmed NAME (not hex) — same color name with
      // slightly different hex codes should still appear only once.
      const map = new Map<string, ExistingColor>();
      (data ?? []).forEach((row: any) => {
        const variants = Array.isArray(row.color_variants) ? row.color_variants : [];
        variants.forEach((v: any) => {
          if (!v?.hex || !v?.name) return;
          const key = String(v.name).trim().toLowerCase();
          if (!key) return;
          if (!map.has(key)) {
            map.set(key, { name: String(v.name).trim(), hex: String(v.hex) });
          }
        });
      });

      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}
