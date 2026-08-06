import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContentCategory = {
  id: string;
  name_lv: string;
  slug: string;
  description_lv: string | null;
  icon_key: string | null;
  sort_order: number;
};

export const useContentCategories = () =>
  useQuery({
    queryKey: ["content-categories"],
    queryFn: async (): Promise<ContentCategory[]> => {
      const { data, error } = await supabase
        .from("content_categories")
        .select("id,name_lv,slug,description_lv,icon_key,sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as ContentCategory[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });