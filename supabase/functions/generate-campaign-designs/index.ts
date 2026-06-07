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
  /** Force a specific image model: "auto" | "ideogram" | "recraft". */
  model_override?: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream";
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

/** High-resolution custom dimensions for print-quality output. fal endpoints
 *  (ideogram v3, recraft v3, flux, seedream) accept {width, height} up to 2048.
 *  We always upgrade preset sizes to 2048 on the long edge so designs are usable
 *  for DTF/print without a lossy upscaler step afterwards. */
function hiResDims(size: string): { width: number; height: number } {
  switch (size) {
    case "portrait_4_3":   return { width: 1536, height: 2048 };
    case "portrait_16_9":  return { width: 1152, height: 2048 };
    case "landscape_4_3":  return { width: 2048, height: 1536 };
    case "landscape_16_9": return { width: 2048, height: 1152 };
    case "square":
    case "square_hd":
    default:               return { width: 2048, height: 2048 };
  }
}

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
}): Promise<{ bytes: Uint8Array; url: string; contentType: string; extension: string }> {
  // v3 handles non-English text & diacritics (Latvian ā ē ī ū č š ž ķ ļ ņ ģ) much better than v2.
  const res = await fetch("https://fal.run/fal-ai/ideogram/v3", {
    method: "POST",
    headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: opts.prompt,
      image_size: hiResDims(opts.imageSize ?? "square_hd"),
      style: "DESIGN",
      rendering_speed: "QUALITY",
      expand_prompt: false,
      num_images: 1,
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
  const contentType = (imgRes.headers.get("content-type") || "image/png").toLowerCase();
  const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
   return { bytes: new Uint8Array(await imgRes.arrayBuffer()), url, contentType, extension };
}

async function removeBackgroundBria(opts: { falKey: string; imageUrl: string }): Promise<Uint8Array> {
  // Strategy: upload the source PNG to fal storage first so background-removal
  // endpoints receive a stable, server-side fal CDN URL (not a signed/short-lived
  // one from another fal endpoint). Then try a small fallback chain so a single
  // model outage doesn't fail the whole design generation.

  // 1. Download bytes from the source URL.
  const dl = await fetch(opts.imageUrl);
  if (!dl.ok) throw new Error(`bg-remove source download ${dl.status}`);
  const srcBytes = new Uint8Array(await dl.arrayBuffer());
  const ct = dl.headers.get("content-type") || "image/png";

  // 2. Upload to fal storage to get a clean CDN URL.
  let uploadedUrl: string | null = null;
  try {
    const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
      method: "POST",
      headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: "src.png", content_type: ct }),
    });
    if (initRes.ok) {
      const init = await initRes.json();
      const putRes = await fetch(init.upload_url, {
        method: "PUT",
        headers: { "Content-Type": ct },
        body: srcBytes,
      });
      if (putRes.ok) uploadedUrl = init.file_url as string;
    }
  } catch (_) { /* fall through to data URI */ }

  // Fall back to base64 data URI if upload failed.
  if (!uploadedUrl) {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < srcBytes.length; i += chunk) {
      bin += String.fromCharCode(...srcBytes.subarray(i, i + chunk));
    }
    uploadedUrl = `data:${ct};base64,${btoa(bin)}`;
  }

  // 3. Try a chain of background-removal models.
  const endpoints: { url: string; body: (u: string) => Record<string, unknown> }[] = [
    { url: "https://fal.run/fal-ai/birefnet/v2", body: (u) => ({ image_url: u }) },
    { url: "https://fal.run/fal-ai/imageutils/rembg", body: (u) => ({ image_url: u }) },
    { url: "https://fal.run/fal-ai/bria/background/remove", body: (u) => ({ image_url: u }) },
  ];
  const errors: string[] = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(ep.body(uploadedUrl)),
      });
      if (!res.ok) {
        errors.push(`${ep.url} ${res.status}: ${(await res.text()).slice(0, 120)}`);
        continue;
      }
      const data = await res.json();
      const outUrl: string | undefined =
        data?.image?.url ?? data?.images?.[0]?.url ?? data?.output?.url;
      if (!outUrl) { errors.push(`${ep.url}: no image url`); continue; }
      const r = await fetch(outUrl);
      if (!r.ok) { errors.push(`${ep.url} download ${r.status}`); continue; }
      return new Uint8Array(await r.arrayBuffer());
    } catch (e: any) {
      errors.push(`${ep.url}: ${e?.message ?? e}`);
    }
  }
  throw new Error(`bg-remove failed: ${errors.join(" | ").slice(0, 400)}`);
}

async function maybeRemoveBackground(opts: {
  falKey: string;
  imageUrl: string;
  originalBytes: Uint8Array;
  enabled?: boolean;
}): Promise<Uint8Array> {
  if (!opts.enabled) return opts.originalBytes;
  try {
    return await removeBackgroundBria({ falKey: opts.falKey, imageUrl: opts.imageUrl });
  } catch (error) {
    console.error("background removal failed, keeping original image:", error);
    return opts.originalBytes;
  }
}

/** Generic fal.ai text-to-image caller for endpoints that share the {prompt, image_size} shape. */
async function generateWithFalEndpoint(opts: {
  falKey: string;
  endpoint: string;
  body: Record<string, unknown>;
}): Promise<{ bytes: Uint8Array; url: string; contentType: string; extension: string }> {
  const res = await fetch(`https://fal.run/${opts.endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(opts.body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${opts.endpoint} ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url: string | undefined =
    data?.images?.[0]?.url ?? data?.image?.url ?? data?.output?.[0];
  if (!url) throw new Error(`${opts.endpoint}: no image url in response`);
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`${opts.endpoint} download ${imgRes.status}`);
  const contentType = (imgRes.headers.get("content-type") || "image/png").toLowerCase();
  const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  return { bytes: new Uint8Array(await imgRes.arrayBuffer()), url, contentType, extension };
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
  model?: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream";
}): Promise<{ bytes: Uint8Array; url: string; contentType: string; extension: string }> {
  const model = opts.model ?? "auto";
  // Detect Latvian-specific characters in either the slogan or the description.
  // If present, Ideogram (v3) handles diacritics far better than Recraft.
  const lvRe = /[āēīōūčšžķļņģĀĒĪŌŪČŠŽĶĻŅĢ]/;
  const hasLatvian =
    lvRe.test(opts.slogan ?? "") || lvRe.test(opts.prompt ?? "");
  // Force Ideogram, or auto-route when a slogan/text or Latvian diacritics are present.
  const useIdeogram =
    model === "ideogram" ||
    (model === "auto" && (!!(opts.slogan && opts.slogan.trim()) || hasLatvian));
  if (useIdeogram) {
    const { bytes, url, contentType, extension } = await generateWithIdeogram({
      falKey: opts.falKey,
      prompt: opts.prompt,
      imageSize: opts.imageSize,
    });
    const finalBytes = await maybeRemoveBackground({
      falKey: opts.falKey,
      imageUrl: url,
      originalBytes: bytes,
      enabled: opts.transparentBg,
    });
    return {
      bytes: finalBytes,
      url,
      contentType: opts.transparentBg ? "image/png" : contentType,
      extension: opts.transparentBg ? "png" : extension,
    };
  }

  const hiDims = hiResDims(opts.imageSize ?? "square_hd");

  // ---- Direct model overrides (skip Recraft branch) ----
  if (model === "flux-pro" || model === "flux-schnell" || model === "nano-banana" || model === "seedream") {
    const endpointMap: Record<string, string> = {
      "flux-pro": "fal-ai/flux-pro/v1.1",
      "flux-schnell": "fal-ai/flux/schnell",
      "nano-banana": "fal-ai/nano-banana",
      "seedream": "fal-ai/bytedance/seedream/v4/text-to-image",
    };
    const body: Record<string, unknown> = { prompt: opts.prompt, image_size: hiDims, num_images: 1 };
    if (model === "seedream") body.image_size = hiDims;
      const { bytes, url, contentType, extension } = await generateWithFalEndpoint({
      falKey: opts.falKey,
      endpoint: endpointMap[model],
      body,
    });
    const finalBytes = await maybeRemoveBackground({
      falKey: opts.falKey,
      imageUrl: url,
      originalBytes: bytes,
      enabled: opts.transparentBg,
    });
      return {
        bytes: finalBytes,
        url,
        contentType: opts.transparentBg ? "image/png" : contentType,
        extension: opts.transparentBg ? "png" : extension,
      };
  }

  const styleSafe = ALLOWED_STYLES.has(opts.style) ? opts.style : "digital_illustration";

  const payload: Record<string, unknown> = {
    prompt: opts.prompt,
    image_size: hiDims,
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

  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`fal.ai image download ${imgRes.status}`);
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  const finalBytes = await maybeRemoveBackground({
    falKey: opts.falKey,
    imageUrl: url,
    originalBytes: bytes,
    enabled: opts.transparentBg,
  });
  return {
    bytes: finalBytes,
    url,
    contentType: opts.transparentBg ? "image/png" : (imgRes.headers.get("content-type") || "image/png").toLowerCase(),
    extension: opts.transparentBg ? "png" : (((imgRes.headers.get("content-type") || "image/png").toLowerCase().includes("jpeg") || (imgRes.headers.get("content-type") || "image/png").toLowerCase().includes("jpg")) ? "jpg" : "png"),
  };
}

function buildPrompt(
  rawPrompt: string,
  style: string,
  transparent: boolean,
  opts: { slogan?: string; fitInFrame?: boolean } = {},
): string {
  const isVector = style.startsWith("vector_illustration");
  const isIllustration = style.startsWith("digital_illustration");
  // Hard cap on base description so the final prompt stays <1000 chars (fal.ai limit).
  const base = rawPrompt.trim().slice(0, 320);
  const slogan = opts.slogan?.trim().slice(0, 100);
  const bgHint = transparent
    ? "Isolated, no edge shadows."
    : "Centered on white background.";
  // Frame-fit + quality rules, kept terse so total prompt stays under 1000 chars.
  const frameRule = "Fit inside canvas with 10% safe padding. DTF print file.";
  const qualityRule =
    "Premium editorial, gallery-grade, refined detail, boutique streetwear. " +
    "NEGATIVE: not childish, not infantile, not amateur, no clip-art, no stock, no kindergarten cartoon.";

  // ===== Slogan / typography-led design (routed to Ideogram) =====
  if (slogan) {
    const out =
      `Premium typographic t-shirt print. HERO text: "${slogan}" — large, bold, expressive custom lettering, perfectly spelled (preserve every diacritic), stacked, confident hierarchy, filling most of canvas. ` +
      `Add refined ornamental flourishes, ribbons or vintage screen-print textures. ` +
      `Supporting motif: ${base}. ` +
      `Artisan screen-print, 2–4 disciplined colors. ${bgHint} ${frameRule} ${qualityRule} ` +
      `Text IS the design. No garment, mockup, person, fabric. No extra text beyond "${slogan}".`;
    return out.slice(0, 990);
  }

  // ===== No slogan — pure illustration (Recraft) =====
  const styleHint = isVector
    ? "Bold confident flat vector, refined shapes, disciplined palette."
    : isIllustration
    ? "Sophisticated illustration, intricate detail, balanced composition."
    : "Premium screen-print artwork.";
  const out =
    `${base}. ${styleHint} ${bgHint} ${frameRule} ${qualityRule} ` +
    `Standalone artwork like a sticker. No garment, mockup, person, fabric. No text, no letters, no watermark, no scene.`;
  return out.slice(0, 990);
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
        const { bytes, contentType, extension } = await generateWithFal({
          falKey: FAL_KEY, prompt: finalPrompt, style: useStyle,
          customStyleId: useCustomId, imageSize: useSize, colors: useColors, transparentBg: useTransparent,
          slogan,
          model: body.model_override,
        });
        const path = `${campaign_id}/${design_id}-${Date.now()}.${extension}`;
        const { error: upErr } = await admin.storage
          .from("campaign-assets")
          .upload(path, bytes, { contentType, upsert: true });
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
        const { bytes, contentType, extension } = await generateWithFal({
          falKey: FAL_KEY, prompt: finalPrompt, style: useStyle,
          customStyleId: useCustomId, imageSize: useSize, colors: useColors, transparentBg: useTransparent,
          slogan,
          model: body.model_override,
        });
        const path = `${campaign_id}/${i}-${Date.now()}.${extension}`;
        const { error: upErr } = await admin.storage
          .from("campaign-assets")
          .upload(path, bytes, { contentType, upsert: true });
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