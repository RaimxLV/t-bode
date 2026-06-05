import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  campaign_id: string;
  design_id?: string;
  prompt_override?: string;
  style?: string;
  /** Optional Recraft custom style UUID (overrides preset). */
  custom_style_id?: string;
  /** Square_hd / square / portrait_hd / landscape_hd / landscape. */
  image_size?: string;
  /** Up to 5 preferred RGB colors, e.g. [{r:200,g:30,b:40}]. */
  colors?: { r: number; g: number; b: number }[];
  /** Strip background after generation (Bria). */
  transparent_bg?: boolean;
  /** Per-design slogan text to weave into the artwork (auto-routes to Ideogram). */
  slogan_override?: string;
}

/** Allowed Recraft V3 styles (full list from fal.ai schema). */
const ALLOWED_STYLES = new Set<string>([
  "any",
  // Realistic
  "realistic_image",
  "realistic_image/b_and_w","realistic_image/hard_flash","realistic_image/hdr",
  "realistic_image/natural_light","realistic_image/studio_portrait","realistic_image/enterprise",
  "realistic_image/motion_blur","realistic_image/evening_light","realistic_image/faded_nostalgia",
  "realistic_image/forest_life","realistic_image/mystic_naturalism","realistic_image/natural_tones",
  "realistic_image/organic_calm","realistic_image/real_life_glow","realistic_image/retro_realism",
  "realistic_image/retro_snapshot","realistic_image/urban_drama","realistic_image/village_realism",
  "realistic_image/warm_folk",
  // Digital illustration
  "digital_illustration",
  "digital_illustration/pixel_art","digital_illustration/hand_drawn","digital_illustration/grain",
  "digital_illustration/infantile_sketch","digital_illustration/2d_art_poster",
  "digital_illustration/2d_art_poster_2","digital_illustration/handmade_3d",
  "digital_illustration/hand_drawn_outline","digital_illustration/engraving_color",
  "digital_illustration/antiquarian","digital_illustration/bold_fantasy","digital_illustration/child_book",
  "digital_illustration/cover","digital_illustration/crosshatch","digital_illustration/digital_engraving",
  "digital_illustration/expressionism","digital_illustration/freehand_details",
  "digital_illustration/graphic_intensity","digital_illustration/hard_comics","digital_illustration/long_shadow",
  "digital_illustration/modern_folk","digital_illustration/multicolor","digital_illustration/neon_calm",
  "digital_illustration/noir","digital_illustration/nostalgic_pastel","digital_illustration/outline_details",
  "digital_illustration/pastel_gradient","digital_illustration/pastel_sketch","digital_illustration/pop_art",
  "digital_illustration/pop_renaissance","digital_illustration/street_art","digital_illustration/tablet_sketch",
  "digital_illustration/urban_glow","digital_illustration/urban_sketching","digital_illustration/vanilla_dreams",
  "digital_illustration/young_adult_book",
  // Vector
  "vector_illustration",
  "vector_illustration/bold_stroke","vector_illustration/chemistry","vector_illustration/colored_stencil",
  "vector_illustration/contour_pop_art","vector_illustration/cosmics","vector_illustration/cutout",
  "vector_illustration/depressive","vector_illustration/editorial","vector_illustration/emotional_flat",
  "vector_illustration/engraving","vector_illustration/infographical","vector_illustration/line_art",
  "vector_illustration/line_circuit","vector_illustration/linocut","vector_illustration/marker_outline",
  "vector_illustration/mosaic","vector_illustration/naivector","vector_illustration/roundish_flat",
  "vector_illustration/segmented_colors","vector_illustration/sharp_contrast","vector_illustration/thin",
  "vector_illustration/vector_photo","vector_illustration/vivid_shapes",
]);

const ALLOWED_SIZES = new Set([
  "square_hd","square","portrait_4_3","portrait_16_9","landscape_4_3","landscape_16_9",
]);

/** Map fal image_size to Ideogram aspect_ratio. */
function sizeToAspect(size: string): string {
  switch (size) {
    case "portrait_4_3": return "3:4";
    case "portrait_16_9": return "9:16";
    case "landscape_4_3": return "4:3";
    case "landscape_16_9": return "16:9";
    default: return "1:1";
  }
}

async function generateWithIdeogram(opts: {
  falKey: string;
  prompt: string;
  imageSize?: string;
}): Promise<{ bytes: Uint8Array; url: string }> {
  const res = await fetch("https://fal.run/fal-ai/ideogram/v2", {
    method: "POST",
    headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: opts.prompt,
      aspect_ratio: sizeToAspect(opts.imageSize ?? "square_hd"),
      style: "design",
      expand_prompt: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ideogram ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url: string | undefined = data?.images?.[0]?.url ?? data?.image?.url;
  if (!url) throw new Error("ideogram: no image url");
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`ideogram download ${imgRes.status}`);
  return { bytes: new Uint8Array(await imgRes.arrayBuffer()), url };
}

async function removeBackgroundBria(opts: { falKey: string; imageUrl: string }): Promise<Uint8Array> {
  const res = await fetch("https://fal.run/fal-ai/bria/background/remove", {
    method: "POST",
    headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: opts.imageUrl }),
  });
  if (!res.ok) throw new Error(`Bria ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const url: string | undefined = data?.image?.url;
  if (!url) throw new Error("Bria: no image url");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Bria download ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function generateWithFal(opts: {
  falKey: string;
  prompt: string;
  style: string;
  customStyleId?: string;
  imageSize?: string;
  colors?: { r: number; g: number; b: number }[];
  transparentBg?: boolean;
  slogan?: string;
}): Promise<{ bytes: Uint8Array; url: string }> {
  // Auto-route: if a slogan/text is required, use Ideogram (much better at legible text).
  if (opts.slogan && opts.slogan.trim()) {
    const { bytes, url } = await generateWithIdeogram({
      falKey: opts.falKey,
      prompt: opts.prompt,
      imageSize: opts.imageSize,
    });
    if (opts.transparentBg) {
      const stripped = await removeBackgroundBria({ falKey: opts.falKey, imageUrl: url });
      return { bytes: stripped, url };
    }
    return { bytes, url };
  }

  const styleSafe = ALLOWED_STYLES.has(opts.style) ? opts.style : "digital_illustration";
  const sizeSafe = ALLOWED_SIZES.has(opts.imageSize ?? "") ? opts.imageSize : "square_hd";

  const payload: Record<string, unknown> = {
    prompt: opts.prompt,
    image_size: sizeSafe,
  };
  if (opts.customStyleId && opts.customStyleId.trim()) {
    payload.style_id = opts.customStyleId.trim();
  } else {
    payload.style = styleSafe;
  }
  if (opts.colors?.length) {
    payload.colors = opts.colors.slice(0, 5).map((c) => ({
      r: Math.max(0, Math.min(255, c.r | 0)),
      g: Math.max(0, Math.min(255, c.g | 0)),
      b: Math.max(0, Math.min(255, c.b | 0)),
    }));
  }

  const res = await fetch("https://fal.run/fal-ai/recraft-v3", {
    method: "POST",
    headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal.ai ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url: string | undefined = data?.images?.[0]?.url;
  if (!url) throw new Error("fal.ai: no image url in response");

  if (opts.transparentBg) {
    const bytes = await removeBackgroundBria({ falKey: opts.falKey, imageUrl: url });
    return { bytes, url };
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`fal.ai image download ${imgRes.status}`);
  return { bytes: new Uint8Array(await imgRes.arrayBuffer()), url };
}

function buildPrompt(
  rawPrompt: string,
  style: string,
  transparent: boolean,
  opts: { slogan?: string; fitInFrame?: boolean } = {},
): string {
  const isVector = style.startsWith("vector_illustration");
  const isIllustration = style.startsWith("digital_illustration");
  const base = rawPrompt.trim();
  const slogan = opts.slogan?.trim();
  const bgHint = transparent
    ? "Isolated on a plain solid background that can be cleanly removed. No shadows touching edges."
    : "Centered composition isolated on a pure white background.";
  const frameRule = opts.fitInFrame
    ? `CRITICAL FRAMING: the ENTIRE composition must fit completely inside the canvas with at least 10% safe padding on every side. Nothing touches the edges — this is a DTF print file.`
    : `Centered composition.`;

  // ===== Slogan / typography-led design (routed to Ideogram) =====
  if (slogan) {
    return (
      `Vintage typographic t-shirt print design. The HERO of the artwork is the exact phrase "${slogan}" rendered as LARGE, BOLD, DISTRESSED VINTAGE TYPOGRAPHY that fills most of the canvas — like a screen-printed beer/biker/retro apparel graphic. ` +
      `The text MUST be the dominant visual element, perfectly spelled, stacked on multiple lines if needed, with ornamental flourishes, banners, ribbons, or decorative frames around it. ` +
      `Theme/illustration context (use as supporting decoration around the text, NOT as the main subject): ${base}. ` +
      `Style: hand-drawn vintage screen-print, distressed texture, monochrome or 2-3 color limited palette, woodcut/letterpress feel. ` +
      `${bgHint} ${frameRule} ` +
      `STRICT: do NOT render the text as a caption below or beside the illustration — the text IS the design. ` +
      `Do NOT show a t-shirt, hoodie, mug, garment, mockup, person, hanger, or fabric. Output ONLY the standalone print artwork. ` +
      `No watermark, no extra text beyond "${slogan}".`
    );
  }

  // ===== No slogan — pure illustration (Recraft) =====
  const styleHint = isVector
    ? "Bold flat vector artwork, clean geometric shapes, screen-print ready, limited palette."
    : isIllustration
    ? "Bold illustrated artwork with rich detail, centered composition, screen-print ready."
    : "Bold artwork suitable for screen-printing on apparel.";
  return (
    `${base}. ${styleHint} ${bgHint} ${frameRule} ` +
    `STRICT: do NOT show a t-shirt, hoodie, mug, garment, mockup, person model, hanger, or fabric. ` +
    `Output ONLY the standalone design artwork itself — like a sticker or print file. ` +
    `No text, no letters, no watermark. No shadows, no photo, no background scene.`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body: Body = await req.json();
    const {
      campaign_id, design_id, prompt_override,
      style: bodyStyle, custom_style_id, image_size, colors, transparent_bg,
    } = body;
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
      .select("id, brief, style, custom_style_id, image_size, preferred_colors, transparent_bg, holidays(name_lv)")
      .eq("id", campaign_id)
      .maybeSingle();

    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignStyle: string = (campaign as any).style || "digital_illustration";
    const campCustomId: string | null = (campaign as any).custom_style_id ?? null;
    const campSize: string = (campaign as any).image_size || "square_hd";
    const campColors: { r: number; g: number; b: number }[] = (campaign as any).preferred_colors ?? [];
    const campTransparent: boolean = !!(campaign as any).transparent_bg;
    const campBrief: any = (campaign as any).brief ?? {};
    const campFitInFrame: boolean = !!campBrief.fit_in_frame;

    const useCustomId = (custom_style_id !== undefined ? custom_style_id : campCustomId) || undefined;
    const useSize = image_size || campSize;
    const useColors = colors ?? campColors;
    const useTransparent = transparent_bg !== undefined ? transparent_bg : campTransparent;

    /* ===== SINGLE-DESIGN REGENERATION ===== */
    if (design_id) {
      const { data: existing, error: dErr } = await admin
        .from("campaign_designs")
        .select("id, prompt, style, slogan")
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
      // Slogan: prefer explicit override, else the value stored on the design row.
      const slogan = (
        body.slogan_override !== undefined
          ? body.slogan_override
          : ((existing as any).slogan ?? "")
      ).toString().trim();
      const finalPrompt = buildPrompt(rawPrompt, useStyle, useTransparent, { slogan, fitInFrame: campFitInFrame });

      try {
        const { bytes } = await generateWithFal({
          falKey: FAL_KEY, prompt: finalPrompt, style: useStyle,
          customStyleId: useCustomId, imageSize: useSize, colors: useColors, transparentBg: useTransparent,
          slogan,
        });
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
            slogan: slogan || null,
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
    const ideas: { title: string; prompt: string; slogan?: string }[] = brief?.design_ideas ?? [];
    if (!ideas.length) {
      return new Response(JSON.stringify({ error: "No design_ideas in brief" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist any new campaign-level settings
    const upd: Record<string, unknown> = {};
    if (bodyStyle && bodyStyle !== campaignStyle) upd.style = bodyStyle;
    if (custom_style_id !== undefined && custom_style_id !== campCustomId) upd.custom_style_id = custom_style_id || null;
    if (image_size && image_size !== campSize) upd.image_size = image_size;
    if (colors !== undefined) upd.preferred_colors = colors;
    if (transparent_bg !== undefined && transparent_bg !== campTransparent) upd.transparent_bg = transparent_bg;
    if (Object.keys(upd).length) await admin.from("campaigns").update(upd).eq("id", campaign_id);
    const useStyle = bodyStyle || campaignStyle;

    await admin.from("campaign_designs").delete().eq("campaign_id", campaign_id);
    await admin.from("campaigns").update({ status: "generating_designs" }).eq("id", campaign_id);

    const results: { ok: boolean; idea: string; path?: string; error?: string }[] = [];

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i];
      const slogan = (idea.slogan ?? "").trim();
      const finalPrompt = buildPrompt(idea.prompt, useStyle, useTransparent, { slogan, fitInFrame: campFitInFrame });
      try {
        const { bytes } = await generateWithFal({
          falKey: FAL_KEY, prompt: finalPrompt, style: useStyle,
          customStyleId: useCustomId, imageSize: useSize, colors: useColors, transparentBg: useTransparent,
          slogan,
        });
        const path = `${campaign_id}/${i}-${Date.now()}.png`;
        const { error: upErr } = await admin.storage
          .from("campaign-assets")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;

        const { error: insErr } = await admin.from("campaign_designs").insert({
          campaign_id,
          prompt: idea.prompt,
          slogan: slogan || null,
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
          slogan: (idea.slogan ?? "").trim() || null,
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