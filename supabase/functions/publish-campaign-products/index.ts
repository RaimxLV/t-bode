import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
  default_price?: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function extFromContentType(contentType: string | null): "png" | "jpg" | "svg" | "webp" {
  const value = (contentType || "").toLowerCase();
  if (value.includes("svg")) return "svg";
  if (value.includes("webp")) return "webp";
  return value.includes("jpeg") || value.includes("jpg") ? "jpg" : "png";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const { campaign_id, default_price = 24.99 }: Body = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: campaign } = await admin
      .from("campaigns")
      .select("id, brief, holiday_id, year, title")
      .eq("id", campaign_id)
      .maybeSingle();

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brief: any = (campaign as any).brief ?? {};
    const baseTitle = brief.title_lv ?? campaign.title ?? "Kampaņas produkts";
    const category = (brief.product_types?.[0] ?? "t-shirts").toLowerCase();

    const { data: designs } = await admin
      .from("campaign_designs")
      .select("id, image_url, prompt, is_primary, product_id")
      .eq("campaign_id", campaign_id)
      .eq("is_primary", true)
      .not("image_url", "is", null);

    if (!designs || !designs.length) {
      return new Response(JSON.stringify({ error: "No approved designs (mark at least one as primary)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { ok: boolean; design_id: string; product_id?: string; error?: string }[] = [];

    for (let i = 0; i < designs.length; i++) {
      const d = designs[i] as any;
      try {
        // Skip if product already generated
        if (d.product_id) {
          results.push({ ok: true, design_id: d.id, product_id: d.product_id });
          continue;
        }

        // Download from private campaign-assets bucket
        const { data: file, error: dlErr } = await admin.storage
          .from("campaign-assets")
          .download(d.image_url);
        if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message}`);

        const contentType = file.type || "image/png";
        const bytes = new Uint8Array(await file.arrayBuffer());
        const publicPath = `campaigns/${campaign_id}/${d.id}.${extFromContentType(contentType)}`;
        const { error: upErr } = await admin.storage
          .from("product-images")
          .upload(publicPath, bytes, { contentType, upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = admin.storage.from("product-images").getPublicUrl(publicPath);
        const publicUrl = pub.publicUrl;

        const nameLv = designs.length > 1 ? `${baseTitle} #${i + 1}` : baseTitle;
        const slug = `${slugify(baseTitle)}-${campaign.year}-${i + 1}`;

        const { data: product, error: insErr } = await admin
          .from("products")
          .insert({
            name: nameLv,
            name_lv: nameLv,
            name_en: nameLv,
            slug,
            category,
            price: default_price,
            image_url: publicUrl,
            description_lv: brief.description_lv ?? null,
            description_en: null,
            colors: [],
            sizes: ["S", "M", "L", "XL"],
            color_variants: [],
            customizable: false,
            in_stock: true,
            holiday_id: (campaign as any).holiday_id,
            is_draft: true,
            status: "draft",
          })
          .select("id")
          .maybeSingle();

        if (insErr || !product) throw new Error(insErr?.message ?? "Insert failed");

        await admin
          .from("campaign_designs")
          .update({ product_id: (product as any).id })
          .eq("id", d.id);

        results.push({ ok: true, design_id: d.id, product_id: (product as any).id });
      } catch (e: any) {
        console.error(`Design ${d.id} publish failed:`, e);
        results.push({ ok: false, design_id: d.id, error: e.message ?? String(e) });
      }
    }

    const anyOk = results.some((r) => r.ok);
    if (anyOk) {
      await admin.from("campaigns").update({ status: "products_ready" }).eq("id", campaign_id);
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-campaign-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});