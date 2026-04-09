import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Support pagination as required by Zakeke
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, description, price, category, image_url, sizes, colors, color_variants, in_stock")
      .eq("customizable", true)
      .eq("in_stock", true)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;

    // Format per Zakeke Product Catalog API spec:
    // Required fields: code, name, thumbnail
    const zakekeProducts = (products ?? []).map((p: any) => ({
      code: p.id,
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
