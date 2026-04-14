import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  icon_key: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Get top-level categories */
export function getTopLevel(cats: Category[]) {
  return cats.filter((c) => !c.parent_id);
}

/** Get children of a given parent */
export function getChildren(cats: Category[], parentId: string) {
  return cats.filter((c) => c.parent_id === parentId);
}
