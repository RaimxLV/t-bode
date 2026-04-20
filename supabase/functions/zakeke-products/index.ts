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

function normalizeHex(hex?: string) {
  if (!hex) return undefined;
  const normalized = hex.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toUpperCase() : undefined;
}

function sanitizeCodePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductCode(product: any) {
  return product.zakeke_model_code || product.id || product.slug;
}

// Build Zakeke-formatted variants payload (Color + Size attributes with combinations)
function buildVariantsPayload(product: any, productCode: string) {
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
  const variations: any[] = [];
  let idx = 1;
  for (const color of colorList) {
    for (const size of sizeList) {
      const cv = color ? colorVariants.find((c) => c.name === color) : null;
      const colorHex = normalizeHex(cv?.hex);
      const variationCodeParts = [productCode];
      if (size) variationCodeParts.push(sanitizeCodePart(size));
      if (color) variationCodeParts.push(sanitizeCodePart(color));
      const variationCode = variationCodeParts.join("-");
      const variationLabel = [size, color].filter(Boolean).join(" / ") || product.name;

      combinations.push({
        code: variationCode,
        id: idx++,
        price: Number(product.price) || 0,
        thumbnail: cv?.images?.[0] || product.image_url || "",
        attributes: {
          ...(color ? { Color: color } : {}),
          ...(size ? { Size: size } : {}),
        },
      });

      variations.push({
        code: variationCode,
        name: variationLabel,
        description: variationLabel,
        ...(size ? { size } : {}),
        ...(colorHex ? { color: colorHex } : {}),
        ...(color ? { colorName: color } : {}),
        thumbnail: cv?.images?.[0] || product.image_url || "",
        price: Number(product.price) || 0,
      });
    }
  }

  return { attributes, combinations, variations };
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
      const productQuery = supabase
        .from("products")
        .select("id, name, slug, description, price, category, image_url, sizes, colors, color_variants, in_stock, zakeke_model_code");

      const { data: product, error } = isUuid
        ? await productQuery.or(`zakeke_model_code.eq.${code},slug.eq.${code},id.eq.${code}`).maybeSingle()
        : await productQuery.or(`zakeke_model_code.eq.${code},slug.eq.${code}`).maybeSingle();

      if (error) throw error;
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productCode = getProductCode(product);
      const { attributes, combinations, variations } = buildVariantsPayload(product, productCode);

      const payload = {
        code: productCode,
        id: product.id,
        name: product.name,
        description: product.description || "",
        thumbnail: product.image_url || "",
        price: Number(product.price) || 0,
        currency: "EUR",
        isOutOfStock: !product.in_stock,
        attributes,
        variations,
        variants: combinations,
      };

      console.log("ZAKEKE_PRODUCT_PAYLOAD", JSON.stringify(payload));

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
      code: getProductCode(p),
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
