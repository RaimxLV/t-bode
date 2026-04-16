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
  name_lv: string | null;
  name_en: string | null;
  slug: string;
  description: string | null;
  description_lv: string | null;
  description_en: string | null;
  price: number;
  category: string;
  image_url: string | null;
  sizes: string[] | null;
  colors: string[] | null;
  color_variants: ColorVariant[];
  customizable: boolean;
  in_stock: boolean;
  zakeke_model_code: string | null;
  created_at: string;
  updated_at: string;
}

/** Returns the product name in the current language with fallback */
export function getProductName(product: Pick<DBProduct, "name" | "name_lv" | "name_en">, lang: string): string {
  if (lang === "en") return product.name_en || product.name_lv || product.name;
  return product.name_lv || product.name || product.name_en || "";
}

/** Returns the product description in the current language with fallback */
export function getProductDescription(
  product: Pick<DBProduct, "description" | "description_lv" | "description_en">,
  lang: string
): string {
  if (lang === "en") return product.description_en || product.description_lv || product.description || "";
  return product.description_lv || product.description || product.description_en || "";
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
    zakeke_model_code: (p as any).zakeke_model_code ?? null,
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
    zakeke_model_code: (data as any).zakeke_model_code ?? null,
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
