import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
  /** If provided, only this single design is regenerated (rest untouched). */
  design_id?: string;
  /** Optional custom prompt override (replaces the brief idea prompt). */
  prompt_override?: string;
  /** Optional style preset, e.g. "vector_illustration" or "digital_illustration/2d_art_poster". */
  style?: string;
}

/** Allowed Recraft V3 styles. */
const ALLOWED_STYLES = new Set([
  "any",
  "realistic_image",
  "digital_illustration",
  "digital_illustration/pixel_art",
  "digital_illustration/hand_drawn",
  "digital_illustration/grain",
  "digital_illustration/infantile_sketch",
  "digital_illustration/2d_art_poster",
  "digital_illustration/2d_art_poster_2",
  "digital_illustration/handmade_3d",
  "digital_illustration/hand_drawn_outline",
  "digital_illustration/engraving_color",
  "vector_illustration",
  "vector_illustration/engraving",
  "vector_illustration/line_art",
  "vector_illustration/line_circuit",
  "vector_illustration/linocut",
]);

async function generateWithFal(opts: {
  falKey: string;
  prompt: string;
  style: string;
}): Promise<Uint8Array> {
  const styleSafe = ALLOWED_STYLES.has(opts.style) ? opts.style : "digital_illustration";

  // fal.ai Recraft V3 — supports vector + illustration styles, transparent-friendly,
  // perfect for apparel print designs.
  const res = await fetch("https://fal.run/fal-ai/recraft-v3", {
    method: "POST",
    headers: {
      Authorization: `Key ${opts.falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      style: styleSafe,
      image_size: "square_hd",
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal.ai ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url: string | undefined = data?.images?.[0]?.url;
  if (!url) throw new Error("fal.ai: no image url in response");

  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`fal.ai image download ${imgRes.status}`);
  return new Uint8Array(await imgRes.arrayBuffer());
}

function buildPrompt(rawPrompt: string, style: string): string {
  const isVector = style.startsWith("vector_illustration");
  const isIllustration = style.startsWith("digital_illustration");
  const base = rawPrompt.trim();
  const styleHint = isVector
    ? "Bold flat vector artwork, clean geometric shapes, screen-print ready, limited palette."
    : isIllustration
    ? "Bold illustrated artwork with rich detail, centered composition, screen-print ready."
    : "Bold artwork suitable for screen-printing on apparel.";
  return (
    `${base}. ${styleHint} ` +
    `Centered composition isolated on a pure white background. ` +
    `STRICT: do NOT show a t-shirt, hoodie, mug, garment, mockup, person, model, hanger, or fabric. ` +
    `Output ONLY the standalone design artwork itself — like a sticker or print file. ` +
    `No text, no letters, no watermark, no shadows, no photo, no background scene.`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body: Body = await req.json();
    const { campaign_id, design_id, prompt_override, style: bodyStyle } = body;
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FAL_KEY = Deno.env.get("FAL_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!FAL_KEY) {
      return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: campaign, error: cErr } = await admin
      .from("campaigns")
      .select("id, brief, style, holidays(name_lv)")
      .eq("id", campaign_id)
      .maybeSingle();

    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignStyle: string = (campaign as any).style || "digital_illustration";

    /* ===== SINGLE-DESIGN REGENERATION ===== */
    if (design_id) {
      const { data: existing, error: dErr } = await admin
        .from("campaign_designs")
        .select("id, prompt, style")
        .eq("id", design_id)
        .eq("campaign_id", campaign_id)
        .maybeSingle();
      if (dErr || !existing) {
        return new Response(JSON.stringify({ error: "Design not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rawPrompt = (prompt_override?.trim() || (existing as any).prompt || "").trim();
      const useStyle = bodyStyle || (existing as any).style || campaignStyle;
      const finalPrompt = buildPrompt(rawPrompt, useStyle);

      try {
        const bytes = await generateWithFal({ falKey: FAL_KEY, prompt: finalPrompt, style: useStyle });
        const path = `${campaign_id}/${design_id}-${Date.now()}.png`;
        const { error: upErr } = await admin.storage
          .from("campaign-assets")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;

        const { error: updErr } = await admin
          .from("campaign_designs")
          .update({
            prompt: rawPrompt,
            style: useStyle,
            image_url: path,
            generation_error: null,
          })
          .eq("id", design_id);
        if (updErr) throw updErr;

        return new Response(JSON.stringify({ ok: true, path }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        console.error("single regen failed:", e);
        await admin
          .from("campaign_designs")
          .update({ generation_error: e.message ?? String(e) })
          .eq("id", design_id);
        return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    /* ===== FULL CAMPAIGN GENERATION ===== */
    const brief: any = (campaign as any).brief;
    const ideas: { title: string; prompt: string }[] = brief?.design_ideas ?? [];
    if (!ideas.length) {
      return new Response(JSON.stringify({ error: "No design_ideas in brief" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist any new campaign-level style choice
    if (bodyStyle && bodyStyle !== campaignStyle) {
      await admin.from("campaigns").update({ style: bodyStyle }).eq("id", campaign_id);
    }
    const useStyle = bodyStyle || campaignStyle;

    await admin.from("campaign_designs").delete().eq("campaign_id", campaign_id);
    await admin.from("campaigns").update({ status: "generating_designs" }).eq("id", campaign_id);

    const results: { ok: boolean; idea: string; path?: string; error?: string }[] = [];

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i];
      const finalPrompt = buildPrompt(idea.prompt, useStyle);
      try {
        const bytes = await generateWithFal({ falKey: FAL_KEY, prompt: finalPrompt, style: useStyle });
        const path = `${campaign_id}/${i}-${Date.now()}.png`;
        const { error: upErr } = await admin.storage
          .from("campaign-assets")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;

        const { error: insErr } = await admin.from("campaign_designs").insert({
          campaign_id,
          prompt: idea.prompt,
          style: useStyle,
          image_url: path,
          is_primary: i === 0,
        });
        if (insErr) throw insErr;
        results.push({ ok: true, idea: idea.title, path });
      } catch (e: any) {
        console.error(`Idea ${i} failed:`, e);
        await admin.from("campaign_designs").insert({
          campaign_id,
          prompt: idea.prompt,
          style: useStyle,
          generation_error: e.message ?? String(e),
        });
        results.push({ ok: false, idea: idea.title, error: e.message });
      }
    }

    const anyOk = results.some((r) => r.ok);
    await admin
      .from("campaigns")
      .update({ status: anyOk ? "designs_ready" : "failed" })
      .eq("id", campaign_id);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-campaign-designs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});