import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Type",
};

function buildCorsHeaders(req: Request) {
  return { ...defaultCorsHeaders };
}

interface ColorVariant {
  name?: string;
  hex?: string;
  images?: string[];
}

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

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

function createJsonHeaders(req: Request) {
  const headers = new Headers(buildCorsHeaders(req));
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "public, max-age=60");
  return headers;
}

function isOptionsRequest(url: URL) {
  const decodedSearch = decodeURIComponent(url.search || "").toLowerCase();
  const decodedPath = decodeURIComponent(url.pathname || "").toLowerCase();

  return decodedPath.endsWith("/options") || decodedSearch.includes("/options") || decodedSearch.includes("options=true");
}

function isConfiguratorRequest(url: URL) {
  const decodedPath = decodeURIComponent(url.pathname || "").toLowerCase();
  return decodedPath.endsWith("/configurator") || decodedPath.endsWith("/customizer");
}

function sanitizeCode(raw: string | null): string | null {
  if (!raw) return null;

  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;

  const uuidMatch = decoded.match(UUID_PATTERN);
  if (uuidMatch) return uuidMatch[0];

  let value = decoded
    .replace(/^[?#]/, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/^(?:code|id|productId|product_id|productCode)=/i, "")
    .replace(/^&+/, "")
    .replace(/\/options.*$/i, "")
    .trim();

  value = value.replace(/^(?:options=true|page=\d+)+/i, "").replace(/^[-=&?]+/, "").trim();

  const slugMatch = value.match(/[a-z0-9]+(?:-[a-z0-9]+)+/i);
  if (slugMatch) return slugMatch[0].toLowerCase();

  return value || null;
}

function resolveProductCode(url: URL) {
  // Zakeke calls: /functions/v1/zakeke-products/{code}/options or /{code}/configurator
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("zakeke-products");
  if (idx >= 0 && parts[idx + 1]) {
    const next = parts[idx + 1];
    // Skip if it's a reserved suffix
    if (next !== "options" && next !== "configurator" && next !== "customizer") {
      const sanitized = sanitizeCode(next);
      if (sanitized) return sanitized;
    }
  }

  // Fallback: query params (legacy)
  const queryCandidates = [
    url.searchParams.get("code"),
    url.searchParams.get("id"),
    url.searchParams.get("productId"),
    url.searchParams.get("product_id"),
    url.searchParams.get("productCode"),
  ];

  for (const candidate of queryCandidates) {
    const code = sanitizeCode(candidate);
    if (code) return code;
  }

  return null;
}

function buildOptionsPayload(product: any, productCode: string) {
  // Zakeke wants: [{ code, name, values: [{ code, name }] }]
  // One entry per attribute (Color, Size), each with its possible values.
  const colorVariants: ColorVariant[] = Array.isArray(product.color_variants)
    ? product.color_variants
    : [];
  const colors: string[] = colorVariants.length
    ? (colorVariants.map((c) => c.name).filter(Boolean) as string[])
    : (Array.isArray(product.colors) ? product.colors : []);
  const sizes: string[] = Array.isArray(product.sizes) ? product.sizes : [];

  const options: any[] = [];

  if (colors.length) {
    options.push({
      code: `${productCode}-color`,
      name: "Color",
      values: colors.map((c) => ({
        code: `${productCode}-color-${sanitizeCodePart(c)}`,
        name: c,
      })),
    });
  }

  if (sizes.length) {
    options.push({
      code: `${productCode}-size`,
      name: "Size",
      values: sizes.map((s) => ({
        code: `${productCode}-size-${sanitizeCodePart(s)}`,
        name: s,
      })),
    });
  }

  return options;
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
    const jsonHeaders = createJsonHeaders(req);

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
    console.log("FULL_REQUEST_HEADERS", Object.fromEntries(req.headers.entries()));

    // Optional: validate Basic Auth from Zakeke (if configured)
    const expectedUser = Deno.env.get("ZAKEKE_API_KEY");
    const expectedPass = Deno.env.get("ZAKEKE_CLIENT_SECRET");
    const authHeader = req.headers.get("authorization") || "";
    if (expectedUser && expectedPass && authHeader.toLowerCase().startsWith("basic ")) {
      try {
        const decoded = atob(authHeader.slice(6).trim());
        const [u, p] = decoded.split(":");
        if (u !== expectedUser || p !== expectedPass) {
          console.warn("ZAKEKE_BASIC_AUTH_MISMATCH");
        } else {
          console.log("ZAKEKE_BASIC_AUTH_OK");
        }
      } catch (e) {
        console.warn("ZAKEKE_BASIC_AUTH_DECODE_ERROR", e);
      }
    }

    const code = resolveProductCode(url);
    const isUuid = !!code && UUID_PATTERN.test(code);
    console.log("ZAKEKE_RESOLVED_CODE", { code, isUuid });

    const optionsRequest = isOptionsRequest(url);
    const configuratorRequest = isConfiguratorRequest(url);

    // ---- Configurator/Customizer enable/disable (POST/DELETE /{code}/customizer or /configurator) ----
    if (configuratorRequest && code) {
      console.log("ZAKEKE_CONFIGURATOR_REQUEST", { method: req.method, code, path: url.pathname });
      // We don't track this server-side; just acknowledge so Zakeke is happy.
      // Zakeke just expects HTTP 200 OK with empty body.
      return new Response("", { headers: corsHeaders, status: 200 });
    }

    // ---- Single-product mode ----
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
          headers: jsonHeaders,
        });
      }

      const productCode = getProductCode(product);

      // Per Zakeke spec: /options must return a JSON ARRAY of options
      if (optionsRequest) {
        const options = buildOptionsPayload(product, productCode);
        console.log("ZAKEKE_PRODUCT_OPTIONS_PAYLOAD", JSON.stringify(options));
        return new Response(JSON.stringify(options), {
          headers: jsonHeaders,
          status: 200,
        });
      }

      // Single product fetch (not standard in Zakeke spec, but kept for compatibility)
      const payload = {
        code: productCode,
        name: product.name,
        thumbnail: product.image_url || "",
      };
      console.log("ZAKEKE_PRODUCT_PAYLOAD", JSON.stringify(payload));
      return new Response(JSON.stringify(payload), {
        headers: jsonHeaders,
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

    // Optional search filter
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const filtered = search
      ? (products ?? []).filter((p: any) =>
          (p.name || "").toLowerCase().includes(search) ||
          (getProductCode(p) || "").toLowerCase().includes(search)
        )
      : (products ?? []);

    // Per Zakeke spec: only code, name, thumbnail (no extra fields)
    const zakekeProducts = filtered.map((p: any) => ({
      code: getProductCode(p),
      name: p.name,
      thumbnail: p.image_url || "",
    }));

    console.log("ZAKEKE_PRODUCTS_LIST_PAYLOAD", JSON.stringify(zakekeProducts));

    return new Response(JSON.stringify(zakekeProducts), {
      headers: jsonHeaders,
      status: 200,
    });
  } catch (err) {
    console.error("Zakeke products error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch products" }),
      { status: 500, headers: createJsonHeaders(req) }
    );
  }
});
