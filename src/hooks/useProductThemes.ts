import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductTheme {
  id: string;
  name_lv: string;
  name_en: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export function useProductThemes() {
  return useQuery({
    queryKey: ["product-themes"],
    queryFn: async (): Promise<ProductTheme[]> => {
      const { data, error } = await supabase
        .from("product_themes")
        .select("id, name_lv, name_en, slug, sort_order, is_active")
        .order("sort_order", { ascending: true })
        .order("name_lv", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductTheme[];
    },
  });
}

export function themeLabel(theme: Pick<ProductTheme, "name_lv" | "name_en">, lang: string) {
  return lang === "en" ? theme.name_en || theme.name_lv : theme.name_lv;
}
