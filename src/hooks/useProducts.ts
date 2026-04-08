import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ColorVariant {
  name: string;
  hex: string;
  images: string[];
}

export interface DBProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  sizes: string[] | null;
  colors: string[] | null;
  color_variants: ColorVariant[];
  customizable: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchProducts(customizable?: boolean): Promise<DBProduct[]> {
  let query = supabase.from("products").select("*").order("created_at", { ascending: true });
  if (customizable !== undefined) {
    query = query.eq("customizable", customizable);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...p,
    color_variants: (p.color_variants as unknown as ColorVariant[]) ?? [],
  }));
}

async function fetchProductBySlug(slug: string): Promise<DBProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    color_variants: (data.color_variants as unknown as ColorVariant[]) ?? [],
  };
}

export function useDesignProducts() {
  return useQuery({
    queryKey: ["products", "design"],
    queryFn: () => fetchProducts(true),
  });
}

export function useCollectionProducts() {
  return useQuery({
    queryKey: ["products", "collection"],
    queryFn: () => fetchProducts(false),
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts(),
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["products", "slug", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });
}
