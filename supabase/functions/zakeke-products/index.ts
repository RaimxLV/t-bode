import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface ColorVariant {
  name?: string;
  hex?: string;
  images?: string[];
}

// Build Zakeke-formatted variants payload (Color + Size attributes with combinations)
function buildVariantsPayload(product: any) {
  const colorVariants: ColorVariant[] = Array.isArray(product.color_variants)
    ? product.color_variants
    : [];
  const colors: string[] = colorVariants.length
    ? colorVariants.map((c) => c.name).filter(Boolean) as string[]
    : (Array.isArray(product.colors) ? product.colors : []);
  const sizes: string[] = Array.isArray(product.sizes) ? product.sizes : [];

  const attributes: Array<{ name: string; values: { name: string; thumbnail?: string }[] }> = [];

  if (colors.length) {
    attributes.push({
      name: "Color",
      values: colors.map((name) => {
        const cv = colorVariants.find((c) => c.name === name);
        return {
          name,
          thumbnail: cv?.images?.[0] || product.image_url || "",
          ...(cv?.hex ? { hex: cv.hex } : {}),
        } as { name: string; thumbnail?: string; hex?: string };
      }),
    });
  }

  if (sizes.length) {
    attributes.push({
      name: "Size",
      values: sizes.map((name) => ({ name })),
    });
  }

  // Generate all combinations (cartesian product) of color × size
  const colorList = colors.length ? colors : [null];
  const sizeList = sizes.length ? sizes : [null];
  const combinations: any[] = [];
  let idx = 1;
  for (const color of colorList) {
    for (const size of sizeList) {
      const cv = color ? colorVariants.find((c) => c.name === color) : null;
      const codeParts = [product.zakeke_model_code || product.slug];
      if (color) codeParts.push(color);
      if (size) codeParts.push(size);
      combinations.push({
        code: codeParts.join("-"),
        id: idx++,
        price: Number(product.price) || 0,
        thumbnail: cv?.images?.[0] || product.image_url || "",
        attributes: {
          ...(color ? { Color: color } : {}),
          ...(size ? { Size: size } : {}),
        },
      });
    }
  }

  return { attributes, combinations };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    // Zakeke may pass code/productId/id as query param
    const code =
      url.searchParams.get("code") ||
      url.searchParams.get("productId") ||
      url.searchParams.get("product_id") ||
      url.searchParams.get("id");
    const isUuid = !!code && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code);

    // ---- Single-product mode (with variants) ----
    if (code) {
      let query = supabase
        .from("products")
        .select("id, name, slug, description, price, category, image_url, sizes, colors, color_variants, in_stock, zakeke_model_code");

      query = isUuid
        ? query.or(`zakeke_model_code.eq.${code},slug.eq.${code},id.eq.${code}`)
        : query.or(`zakeke_model_code.eq.${code},slug.eq.${code}`);

      const { data: product, error } = await query.maybeSingle();

      if (error) throw error;
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { attributes, combinations } = buildVariantsPayload(product);

      const payload = {
        code: product.zakeke_model_code || product.slug,
        id: product.id,
        name: product.name,
        description: product.description || "",
        thumbnail: product.image_url || "",
        price: Number(product.price) || 0,
        currency: "EUR",
        isOutOfStock: !product.in_stock,
        attributes,
        variants: combinations,
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ---- List mode (paginated) ----
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, description, price, category, image_url, sizes, colors, color_variants, in_stock, zakeke_model_code")
      .eq("customizable", true)
      .eq("in_stock", true)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const zakekeProducts = (products ?? []).map((p: any) => ({
      code: p.zakeke_model_code || p.slug,
      name: p.name,
      thumbnail: p.image_url || "",
    }));

    return new Response(JSON.stringify(zakekeProducts), {
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
