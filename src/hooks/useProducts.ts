import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveLegacyProductImage } from "@/lib/legacyProductImages";

export function resolveProductImages<T extends { image_url: string | null; color_variants?: unknown; gallery_images?: unknown; showcase_images?: unknown; mockup_image_url?: string | null }>(product: T): T {
  const imageList = (value: unknown) => Array.isArray(value) ? value.map((src) => typeof src === "string" ? resolveLegacyProductImage(src) : src) : [];
  return {
    ...product,
    image_url: product.image_url ? resolveLegacyProductImage(product.image_url) : product.image_url,
    mockup_image_url: product.mockup_image_url ? resolveLegacyProductImage(product.mockup_image_url) : product.mockup_image_url,
    gallery_images: imageList(product.gallery_images),
    showcase_images: imageList(product.showcase_images),
    color_variants: Array.isArray(product.color_variants) ? product.color_variants.map((variant) => ({ ...variant, images: imageList(variant.images) })) : [],
  };
}

export interface ColorVariant {
  name: string;
  hex: string;
  images: string[];
  /** Optional per-color size availability. Empty/undefined = all product sizes. */
  sizes?: string[];
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
  mockup_image_url: string | null;
  gallery_images: string[];
  showcase_images: string[];
  sizes: string[] | null;
  colors: string[] | null;
  color_variants: ColorVariant[];
  customizable: boolean;
  in_stock: boolean;
  zakeke_model_code: string | null;
  campaign_id: string | null;
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
  let query = supabase
    .from("products")
    .select("*")
    .eq("is_draft", false)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (customizable !== undefined) {
    query = query.eq("customizable", customizable);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...resolveProductImages(p),
    color_variants: (resolveProductImages(p).color_variants as unknown as ColorVariant[]) ?? [],
    zakeke_model_code: (p as any).zakeke_model_code ?? null,
    gallery_images: resolveProductImages(p).gallery_images as string[],
    showcase_images: resolveProductImages(p).showcase_images as string[],
  }));
}

async function fetchCollectionProducts(): Promise<DBProduct[]> {
  // Non-customizable products PLUS any campaign/blog products explicitly flagged
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_draft", false)
    .or("customizable.eq.false,show_in_collection.eq.true")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...resolveProductImages(p),
    color_variants: (resolveProductImages(p).color_variants as unknown as ColorVariant[]) ?? [],
    zakeke_model_code: (p as any).zakeke_model_code ?? null,
    gallery_images: resolveProductImages(p).gallery_images as string[],
    showcase_images: resolveProductImages(p).showcase_images as string[],
  }));
}

async function fetchProductBySlug(slug: string): Promise<DBProduct | null> {
  const params = new URLSearchParams(window.location.search);
  const preview = params.get("preview") === "1";
  let q = supabase.from("products").select("*").eq("slug", slug);
  if (!preview) q = q.eq("is_draft", false);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...resolveProductImages(data),
    color_variants: (resolveProductImages(data).color_variants as unknown as ColorVariant[]) ?? [],
    zakeke_model_code: (data as any).zakeke_model_code ?? null,
    gallery_images: resolveProductImages(data).gallery_images as string[],
    showcase_images: resolveProductImages(data).showcase_images as string[],
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
    queryFn: () => fetchCollectionProducts(),
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
    queryFn: () => slug ? fetchProductBySlug(slug) : Promise.resolve(null),
    enabled: !!slug,
  });
}
