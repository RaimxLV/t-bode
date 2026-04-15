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

/**
 * Given a category slug, return all slugs that should match (itself + children).
 * This enables WooCommerce-like hierarchical filtering:
 * selecting "Latvijas kolekcija" also shows products in its subcategories.
 */
export function getCategorySlugsIncludingChildren(cats: Category[], slug: string): string[] {
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return [slug];
  const children = getChildren(cats, cat.id);
  return [slug, ...children.map((c) => c.slug)];
}

/**
 * Build a flat list of { id: slug, key: translationKey, parentId } from DB categories,
 * prepended with an "all" option.
 */
export function buildCategoryFilterList(
  cats: Category[],
  allKey: string = "categories.all"
): { id: string; key: string }[] {
  const topLevel = getTopLevel(cats);
  const result: { id: string; key: string }[] = [{ id: "all", key: allKey }];

  for (const cat of topLevel) {
    // Use icon_key to map to translation key, fallback to slug
    result.push({ id: cat.slug, key: `categories.${cat.icon_key || cat.slug}` });
  }

  return result;
}
