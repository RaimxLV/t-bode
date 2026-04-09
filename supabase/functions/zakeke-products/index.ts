import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, description, price, category, image_url, sizes, colors, color_variants, in_stock")
      .eq("customizable", true)
      .eq("in_stock", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Format for Zakeke catalog import
    const zakekeProducts = (products ?? []).map((p: any) => ({
      productID: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price,
      currency: "EUR",
      imageUrl: p.image_url || "",
      variants: (p.color_variants || []).flatMap((cv: any) =>
        (p.sizes || []).map((size: string) => ({
          variantID: `${p.id}-${cv.name}-${size}`,
          attributes: {
            Color: cv.name,
            Size: size,
          },
          imageUrl: cv.images?.[0] || p.image_url || "",
          price: p.price,
          inStock: true,
        }))
      ),
    }));

    return new Response(JSON.stringify({ products: zakekeProducts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Zakeke products error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch products" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
