import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
  /** If set, regenerate ONLY this idea index (0-based) and keep the rest. */
  idea_index?: number;
  /** Optional hint when regenerating a single idea (e.g. "vairāk humora, neon krāsas"). */
  hint?: string;
}

interface Brief {
  title_lv: string;
  tagline_lv: string;
  description_lv: string;
  target_audience: string;
  color_palette: string[]; // hex
  design_ideas: { title: string; prompt: string; slogan?: string }[];
  product_types: string[]; // e.g. ["t-shirt", "hoodie", "mug"]
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const { campaign_id, idea_index, hint }: Body = await req.json();
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
      .select("id, year, brief, holiday_id, holidays(name_lv, name_en, prompt_theme, month, day)")
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
    const existingBrief: Partial<Brief> = ((campaign as any).brief ?? {}) as any;
    const singleMode = typeof idea_index === "number" && Array.isArray(existingBrief.design_ideas);

    // Mark generating
    if (!singleMode) {
      await admin.from("campaigns").update({ status: "generating" }).eq("id", campaign_id);
    }

    const systemPrompt = `You are a senior creative director for T-Bode — a Latvian custom apparel brand (DTF-printed t-shirts, hoodies, mugs, tote bags) from Rīga. You design HIGHLY ORIGINAL, MODERN, BOLD seasonal campaigns for the Latvian market.

Hard rules:
- ALWAYS write Latvian copy (title, tagline, description, slogans) in fluent, natural, contemporary Latvian — no awkward AI-translation, no English loanwords unless they are real LV slang.
- Slogans should feel like things a real Latvian would actually say or quote: humor, folk wisdom, pop-culture references, mild irony, regional sayings ("kur Janka, tur pjanka", "miers virsū" style — but invent ORIGINAL ones; don't copy that exact phrase unless it truly fits).
- Design prompts (in English, for an image-gen model) must be DETAILED, CINEMATIC, MODERN — describe composition, color palette, illustration style (e.g. bold flat vector, retro screen-print, vintage woodcut, neo-folk, pop-art, risograph), mood, decorative elements. Avoid stock-photo clichés ("happy family in field", "smiling person holding flowers").
- NEVER describe a t-shirt/hoodie/mug/mockup — describe ONLY the standalone artwork as if it were a print file / sticker.
- THE MAIN SUBJECT OF EVERY DESIGN MUST BE NATURE. The holiday is only the seasonal lens / mood — it is NOT the literal subject. Build the artwork around Latvian wild nature: native flora (oak, linden, birch, ferns, wildflowers, mosses, mushrooms, berries, herbs), native fauna (lynx, wolf, fox, owl, hare, stork, woodpecker, bees, deer, beaver, hedgehog), botanical still-lifes, atmospheric landscapes (pine forest, bog, dunes, meadow, river bend, frozen lake, misty hills). Latvju raksti can appear as a subtle ornamental accent, never as the headline.
- FORBIDDEN clichés (these are cheap shortcuts — never use them as the central concept): jāņu vainags / generic flower crown, Latvian flag stripes (maroon-white-maroon), national costume / tautastērps figures, gingerbread heart, generic christmas tree, generic pumpkin, plain typographic poster with no nature subject, AI-fantasy creatures, kitsch tourist souvenir motifs. If the holiday "obvious" answer is one of these, reject it and pivot to a wild-nature interpretation of the same season instead.
- Output ONLY valid JSON matching the schema, no markdown fences, no commentary.`;

    // ----- Single-idea regen branch -----
    if (singleMode) {
      const existingTitles = (existingBrief.design_ideas ?? [])
        .map((i, idx) => idx === idea_index ? null : `"${i.title}"`)
        .filter(Boolean)
        .join(", ");
      const userPromptSingle = `Regenerate ONE design idea (#${(idea_index as number) + 1} of ${(existingBrief.design_ideas ?? []).length}) for this Latvian holiday campaign:

Holiday: ${holiday.name_lv} (${holiday.name_en ?? ""})
Date: ${holiday.day}.${holiday.month}.${(campaign as any).year}
Theme keywords: ${holiday.prompt_theme}
Campaign title: ${existingBrief.title_lv ?? "—"}
Tagline: ${existingBrief.tagline_lv ?? "—"}
Existing idea titles to AVOID duplicating: ${existingTitles || "(none)"}
${hint ? `User direction: ${hint}` : ""}

Return JSON: { "title": "Latvian short name (1-4 words)", "prompt": "Detailed cinematic English image prompt — bold modern illustration style, no garment/mockup, the slogan will be the dominant typography", "slogan": "REQUIRED original witty Latvian slogan (2-6 words) to render as the dominant typography of the artwork — never empty" }

Be DIFFERENT and more daring than the existing ideas.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPromptSingle },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        console.error("single-idea AI error:", aiRes.status, t);
        return new Response(JSON.stringify({ error: aiRes.status === 429 ? "AI rate limit. Mēģini vēlāk." : aiRes.status === 402 ? "AI kredīti beigušies." : "AI ģenerēšanas kļūda" }), {
          status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiData = await aiRes.json();
      let newIdea: { title: string; prompt: string; slogan?: string };
      try {
        newIdea = JSON.parse(aiData.choices?.[0]?.message?.content ?? "{}");
      } catch {
        return new Response(JSON.stringify({ error: "AI atbilde nav derīgs JSON" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ideas = [...(existingBrief.design_ideas ?? [])];
      ideas[idea_index as number] = {
        title: newIdea.title ?? ideas[idea_index as number]?.title ?? "Ideja",
        prompt: newIdea.prompt ?? "",
        slogan: (newIdea.slogan ?? "").trim() || undefined,
      };
      const merged = { ...existingBrief, design_ideas: ideas };
      await admin.from("campaigns").update({ brief: merged as any }).eq("id", campaign_id);
      return new Response(JSON.stringify({ brief: merged, idea: ideas[idea_index as number] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    { "title": "Short LV name", "prompt": "Long, richly detailed cinematic English image-gen prompt. See REQUIREMENTS below.", "slogan": "REQUIRED Latvian slogan (2-6 words) rendered as dominant typography" }
  ],
  "product_types": ["t-shirt", "hoodie", "mug", "tote-bag"]
}

REQUIREMENTS for design_ideas:
- Generate EXACTLY 1 idea (one element in the design_ideas array). Make it the strongest, most stylish concept — not generic, not obvious, not the first cliché that comes to mind (e.g. NEVER default to "jāņu vainags / oak wreath / Latvian flag colors" unless the brief genuinely demands it).
- The "slogan" field is REQUIRED: an original, witty, culturally rich Latvian phrase (2-6 words) rendered as the dominant typography of the artwork (vintage / hand-drawn / distressed lettering style). Must be in natural contemporary Latvian — humorous, ironic, poetic, or culturally specific. Reference Latvian folk traditions, weather, sauna, food, regional slang where the holiday fits — but invent fresh phrases, never the cliché "Kur Janka, tur pjanka". No English.
- The "prompt" field (English) must be a LONG, dense, cinematic image-generation prompt of 120-220 words. Use every word to build atmosphere. Specify ALL of: (a) the illustration / printmaking style with a named visual reference (e.g. "in the style of vintage botanical engraving", "neo-folk linocut", "Mucha-inspired art-nouveau", "Japanese ukiyo-e woodblock", "1970s European nature documentary poster", "muted risograph two-color print", "Scandinavian-folk paper-cut illustration"); (b) the exact composition (focal subject, framing, foreground/background layering, negative space, where the slogan typography sits); (c) lighting and mood (time of day, weather, golden hour, mist, moonlight, dappled forest light, etc.); (d) a tight 4-6 colour palette named explicitly (e.g. "deep moss green, antique ivory, oxblood, burnished gold"); (e) 3-6 decorative motifs and textures (grain, halftone, woodcut hatching, hand-drawn vignette borders).
- STRONGLY prefer subjects rooted in NATURE: native Latvian flora and fauna (oak, linden, birch, ferns, wild strawberries, cornflower, daisies, chamomile, mosses, mushrooms), animals in their natural habitat (lynx, wolf, fox, owl, hare, stork, woodpecker, bees, deer, beavers), botanical compositions (wildflower bouquets, herb wreaths, seasonal still-life), atmospheric landscapes (pine forests, bogs, dunes, meadows, river bends). Latvian folk ornaments and Latvju raksti (Saule, Māra, Jumis, Ūsiņš, Pērkons, Auseklis, Laima signs) can be woven in as borders or background pattern when they enhance the concept — but they are an accent, NOT the headline. Avoid generic flags, generic wreaths, and tourist-souvenir clichés.
- Do NOT describe the garment, mockup, model, hanger, or product photography — only the standalone artwork.

Choose product_types most relevant to this holiday (typically 2-3 from: t-shirt, hoodie, mug, tote-bag, kids-shirt).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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