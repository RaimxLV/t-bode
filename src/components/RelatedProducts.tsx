import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { ColorVariant, DBProduct } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";

interface RelatedProductsProps {
  category: string;
  excludeId: string;
  limit?: number;
}

export const RelatedProducts = ({ category, excludeId, limit = 4 }: RelatedProductsProps) => {
  const { t } = useTranslation();

  const { data: products, isLoading } = useQuery({
    queryKey: ["related-products", category, excludeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category", category)
        .neq("id", excludeId)
        .eq("in_stock", true)
        .limit(limit);
      return (data ?? []).map((p: any) => ({
        ...p,
        color_variants: (p.color_variants ?? []) as ColorVariant[],
        zakeke_model_code: p.zakeke_model_code ?? null,
      })) as DBProduct[];
    },
    enabled: !!category && !!excludeId,
  });

  if (isLoading || !products || products.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-border">
      <h2 className="text-2xl md:text-3xl font-display mb-6">
        {t("productDetail.relatedProducts", "Līdzīgie produkti")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};
