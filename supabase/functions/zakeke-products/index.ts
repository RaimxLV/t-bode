import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const defaultCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Vary": "Origin",
};

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin")?.trim();
  const allowedOrigin = origin && /(^https:\/\/([a-z0-9-]+\.)*zakeke\.com$)|(^https:\/\/([a-z0-9-]+\.)*zak\.app$)/i.test(origin)
    ? origin
    : "*";

  return {
    ...defaultCorsHeaders,
    "Access-Control-Allow-Origin": allowedOrigin,
  };
}

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

function isOptionsRequest(url: URL) {
  const decodedSearch = decodeURIComponent(url.search || "").toLowerCase();
  const decodedPath = decodeURIComponent(url.pathname || "").toLowerCase();

  return decodedPath.endsWith("/options") || decodedSearch.includes("/options");
}

function buildVariantsPayload(product: any, productCode: string) {
  const colorVariants: ColorVariant[] = Array.isArray(product.color_variants)
    ? product.color_variants
    : [];
  const colors: string[] = colorVariants.length
    ? colorVariants.map((c) => c.name).filter(Boolean) as string[]
    : (Array.isArray(product.colors) ? product.colors : []);
  const sizes: string[] = Array.isArray(product.sizes) ? product.sizes : [];

  const colorList = colors.length ? colors : [null];
  const sizeList = sizes.length ? sizes : [null];
  const variations: any[] = [];

  for (const color of colorList) {
    for (const size of sizeList) {
      const cv = color ? colorVariants.find((c) => c.name === color) : null;
      const colorHex = normalizeHex(cv?.hex);
      const variationCodeParts = [productCode];
      if (size) variationCodeParts.push(sanitizeCodePart(size));
      if (color) variationCodeParts.push(sanitizeCodePart(color));
      const variationCode = variationCodeParts.join("-");
      const variationLabel = [size, color].filter(Boolean).join(" / ") || product.name;

      variations.push({
        code: variationCode,
        name: variationLabel,
        description: variationLabel,
        attributes: [
          ...(size ? [{ name: "Size", value: size }] : []),
          ...(colorHex ? [{ name: "Color", value: colorHex }] : []),
        ],
      });
    }
  }

  return { variations };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    console.log("ZAKEKE_INCOMING_REQUEST", {
      method: req.method,
      url: req.url,
      pathname: url.pathname,
      search: url.search,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      userAgent: req.headers.get("user-agent"),
    });

    function sanitizeCode(raw: string | null): string | null {
      if (!raw) return null;
      let v = raw.trim();
      // Strip any unresolved placeholder fragments like "{productid}"
      v = v.replace(/\{[^}]*\}/g, "");
      // Drop trailing path segments (e.g. "/options")
      v = v.split("/")[0];
      v = v.trim();
      return v || null;
    }

    // Try query params first
    let code =
      sanitizeCode(url.searchParams.get("code")) ||
      sanitizeCode(url.searchParams.get("id")) ||
      sanitizeCode(url.searchParams.get("productId")) ||
      sanitizeCode(url.searchParams.get("product_id")) ||
      sanitizeCode(url.searchParams.get("productCode"));

    // Fallback: path-style /zakeke-products/<code>(/options)?
    if (!code) {
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("zakeke-products");
      if (idx >= 0 && parts[idx + 1]) {
        code = sanitizeCode(parts[idx + 1]);
      }
    }

    const isUuid = !!code && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code);
    console.log("ZAKEKE_RESOLVED_CODE", { code, isUuid });

    const optionsRequest = isOptionsRequest(url);

    // ---- Single-product mode (with variants) ----
    if (code) {
      const productQuery = supabase
        .from("products")
        .select(
          optionsRequest
            ? "id, name, slug, sizes, colors, color_variants, zakeke_model_code"
            : "id, name, slug, description, price, category, image_url, sizes, colors, color_variants, in_stock, zakeke_model_code"
        );

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
      const { variations } = buildVariantsPayload(product, productCode);

      const payload = optionsRequest
        ? {
            code: productCode,
            id: product.id,
            name: product.name,
            variations,
          }
        : {
            code: productCode,
            id: product.id,
            name: product.name,
            description: product.description || "",
            thumbnail: product.image_url || "",
            price: Number(product.price) || 0,
            currency: "EUR",
            isOutOfStock: !product.in_stock,
            variations,
          };

      console.log(optionsRequest ? "ZAKEKE_PRODUCT_OPTIONS_PAYLOAD" : "ZAKEKE_PRODUCT_PAYLOAD", JSON.stringify(payload));

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
      id: p.id,
      name: p.name,
      thumbnail: p.image_url || "",
    }));

    console.log("ZAKEKE_PRODUCTS_LIST_PAYLOAD", JSON.stringify(zakekeProducts));

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
