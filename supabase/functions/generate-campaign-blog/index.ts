import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const { campaign_id }: Body = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: campaign } = await admin
      .from("campaigns")
      .select("id, year, brief, holidays(name_lv, prompt_theme)")
      .eq("id", campaign_id)
      .maybeSingle();

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brief: any = (campaign as any).brief ?? {};
    const holidayName = (campaign as any).holidays?.name_lv ?? brief.title_lv ?? "Svētki";
    const theme = (campaign as any).holidays?.prompt_theme ?? "";

    // Find primary design for cover image
    const { data: primaryDesign } = await admin
      .from("campaign_designs")
      .select("id, image_url")
      .eq("campaign_id", campaign_id)
      .eq("is_primary", true)
      .not("image_url", "is", null)
      .limit(1)
      .maybeSingle();

    let coverUrl: string | null = null;
    if (primaryDesign?.image_url) {
      const { data: file } = await admin.storage
        .from("campaign-assets")
        .download((primaryDesign as any).image_url);
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const publicPath = `campaigns/${campaign_id}/blog-cover.png`;
        await admin.storage
          .from("product-images")
          .upload(publicPath, bytes, { contentType: "image/png", upsert: true });
        const { data: pub } = admin.storage.from("product-images").getPublicUrl(publicPath);
        coverUrl = pub.publicUrl;
      }
    }

    // Generate blog content via Lovable AI
    const sysPrompt = `Tu esi T-Bode (Latvijas personalizēto T-kreklu zīmola) bloga rakstu autors. Raksti siltā, draudzīgā, latviskā stilā. Atbildi STINGRI ar JSON objektu šādā formātā:
{
  "title_lv": "...",
  "excerpt_lv": "max 160 zīmes",
  "content_lv": "HTML ar <h2>, <p>, <ul> tagiem, 400-600 vārdi"
}`;

    const userPrompt = `Uzraksti bloga rakstu par "${holidayName}" un kā T-Bode personalizētie apģērbi un dāvanas iekļaujas šajos svētkos.
Tēma/konteksts: ${theme}
Kampaņas tagline: ${brief.tagline_lv ?? ""}
Apraksts: ${brief.description_lv ?? ""}
Mērķauditorija: ${brief.target_audience ?? ""}

Raksts: aizraujošs ievads, 2-3 apakšsadaļas ar <h2>, ieteikumi dāvanām/dizainiem, aicinājums apskatīt kampaņas produktus T-Bode veikalā. Bez izdomātām cenām vai sortimentu sarakstiem.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) throw new Error("AI rate limit (429)");
    if (aiRes.status === 402) throw new Error("AI credits exhausted (402)");
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI error ${aiRes.status}: ${t.slice(0, 200)}`);
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const title = parsed.title_lv?.trim();
    if (!title) throw new Error("AI returned no title");

    const slug = `${slugify(title)}-${campaign.year}`;

    // Delete previous blog for this campaign (regenerate flow)
    await admin.from("blog_posts").delete().eq("campaign_id", campaign_id);

    const { data: post, error: insErr } = await admin
      .from("blog_posts")
      .insert({
        campaign_id,
        title,
        slug,
        excerpt: parsed.excerpt_lv ?? null,
        content: parsed.content_lv ?? "",
        cover_image_url: coverUrl,
        status: "draft",
      })
      .select("id, slug")
      .maybeSingle();

    if (insErr || !post) throw new Error(insErr?.message ?? "Blog insert failed");

    await admin.from("campaigns").update({ status: "blog_ready" }).eq("id", campaign_id);

    return new Response(JSON.stringify({ ok: true, blog: post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-campaign-blog error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});