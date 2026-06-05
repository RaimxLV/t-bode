import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
}

interface Brief {
  title_lv: string;
  tagline_lv: string;
  description_lv: string;
  target_audience: string;
  color_palette: string[]; // hex
  design_ideas: { title: string; prompt: string }[];
  product_types: string[]; // e.g. ["t-shirt", "hoodie", "mug"]
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const { campaign_id }: Body = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load campaign + holiday
    const { data: campaign, error: cErr } = await admin
      .from("campaigns")
      .select("id, year, holiday_id, holidays(name_lv, name_en, prompt_theme, month, day)")
      .eq("id", campaign_id)
      .maybeSingle();

    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const holiday: any = (campaign as any).holidays;
    if (!holiday) {
      return new Response(JSON.stringify({ error: "Holiday not linked" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark generating
    await admin.from("campaigns").update({ status: "generating" }).eq("id", campaign_id);

    const systemPrompt = `You are a creative director for T-Bode — a Latvian custom apparel brand (t-shirts, hoodies, mugs, bags) based in Riga. You design seasonal/holiday marketing campaigns for the Latvian market. Always write in Latvian (LV). Be specific, culturally authentic, and avoid generic stock-photo clichés. Output ONLY valid JSON matching the schema, no markdown, no commentary.`;

    const userPrompt = `Create a campaign brief for the upcoming Latvian holiday:

Holiday: ${holiday.name_lv} (${holiday.name_en ?? ""})
Date: ${holiday.day}.${holiday.month}.${(campaign as any).year}
Theme keywords: ${holiday.prompt_theme}

Return JSON with this exact shape:
{
  "title_lv": "Catchy campaign name in Latvian (max 6 words)",
  "tagline_lv": "One-line marketing tagline in Latvian (max 12 words)",
  "description_lv": "2-3 sentence marketing description for shop visitors, in Latvian",
  "target_audience": "Short description of target audience in Latvian",
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "design_ideas": [
    { "title": "Short LV name", "prompt": "Detailed English image-gen prompt for AI art (style, mood, composition, no text on shirt)" },
    { "title": "...", "prompt": "..." },
    { "title": "...", "prompt": "..." },
    { "title": "...", "prompt": "..." }
  ],
  "product_types": ["t-shirt", "hoodie", "mug", "tote-bag"]
}

Generate 4 distinct design ideas that fit Latvian cultural context. Choose product_types most relevant to this holiday (typically 2-3 from: t-shirt, hoodie, mug, tote-bag, kids-shirt).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "AI rate limit. Mēģini vēlāk." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "AI kredīti beigušies. Pievieno tos Lovable workspace iestatījumos." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "AI ģenerēšanas kļūda" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "{}";
    let brief: Brief;
    try {
      brief = JSON.parse(rawContent);
    } catch (e) {
      console.error("Failed to parse AI JSON:", rawContent);
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "AI atbilde nav derīgs JSON" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist
    const { error: uErr } = await admin
      .from("campaigns")
      .update({
        title: brief.title_lv || `${holiday.name_lv} ${(campaign as any).year}`,
        description: brief.description_lv ?? null,
        brief: brief as any,
        status: "ready_for_review",
      })
      .eq("id", campaign_id);

    if (uErr) {
      console.error("Update error:", uErr);
      return new Response(JSON.stringify({ error: "Datubāzes kļūda" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-campaign-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});