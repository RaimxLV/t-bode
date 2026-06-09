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
  /** Optional custom style UUID retained for compatibility with existing campaign settings. */
  custom_style_id?: string;
  /** Square_hd / square / portrait_hd / landscape_hd / landscape. */
  image_size?: string;
  /** Up to 5 preferred RGB colors, e.g. [{r:200,g:30,b:40}]. */
  colors?: { r: number; g: number; b: number }[];
  /** Return the design with a transparent background when possible. */
  transparent_bg?: boolean;
  /** Per-design slogan text to weave into the artwork. */
  slogan_override?: string;
  /** Legacy model selector kept for UI compatibility; now maps to internal generation modes. */
  model_override?: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream";
}

/** Supported legacy style tokens retained so existing campaigns keep their visual direction. */
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

type GenerationMode = "text" | "illustration";

type FalModelOverride = "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream";

/** Map legacy UI tokens to a fal.ai endpoint. Defaults favour recraft-v3 because it
 *  natively understands our style tokens and renders Latvian text reliably. */
function resolveFalEndpoint(opts: {
  mode: GenerationMode;
  model?: FalModelOverride;
}): string {
  if (opts.mode === "text") {
    return opts.model === "recraft" ? "fal-ai/recraft-v3" : "fal-ai/flux-pro/v1.1";
  }

  switch (opts.model) {
    case "ideogram":
      return "fal-ai/ideogram/v3";
    case "flux-pro":
      return "fal-ai/flux-pro/v1.1";
    case "flux-schnell":
      // Schnell is too weak for typography; if the prompt needs text, escalate to flux-pro.
      return opts.mode === "text" ? "fal-ai/flux-pro/v1.1" : "fal-ai/flux/schnell";
    case "nano-banana":
      return opts.mode === "text" ? "fal-ai/flux-pro/v1.1" : "fal-ai/flux/schnell";
    case "seedream":
      return opts.mode === "text" ? "fal-ai/flux-pro/v1.1" : "fal-ai/bytedance/seedream/v3/text-to-image";
    case "recraft":
      return "fal-ai/recraft-v3";
    case "auto":
    default:
      return "fal-ai/recraft-v3";
  }
}

function detectImageAsset(bytes: Uint8Array, headerContentType?: string | null): { contentType: string; extension: string } {
  const asciiHead = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512))).trimStart().toLowerCase();
  if (asciiHead.startsWith("<svg") || (asciiHead.startsWith("<?xml") && asciiHead.includes("<svg"))) {
    return { contentType: "image/svg+xml", extension: "svg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  const header = (headerContentType || "image/png").toLowerCase();
  if (header.includes("svg")) return { contentType: "image/svg+xml", extension: "svg" };
  if (header.includes("jpeg") || header.includes("jpg")) return { contentType: "image/jpeg", extension: "jpg" };
  if (header.includes("webp")) return { contentType: "image/webp", extension: "webp" };
  return { contentType: "image/png", extension: "png" };
}

function decodeBase64Image(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function resolveGenerationMode(opts: {
  prompt: string;
  slogan?: string;
  model?: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream";
}): GenerationMode {
  const textCue = /\b(text|typography|type|lettering|slogan|quote|headline|caption|words?)\b/i;
  const lvRe = /[āēīōūčšžķļņģĀĒĪŌŪČŠŽĶĻŅĢ]/;
  if ((opts.slogan || "").trim()) return "text";
  if (textCue.test(opts.prompt)) return "text";
  if (lvRe.test(opts.prompt)) return "text";
  return "illustration";
}

function getTypographyVariation(seed?: string | number): string {
  const variants = [
    "modern minimal sans-serif lettering with crisp geometry and clean hierarchy",
    "elegant expressive script lettering with confident flowing strokes",
    "athletic block serif lettering with bold collegiate structure",
    "creative illustrated lettering interwoven with the graphic motif",
  ];

  if (seed === undefined || seed === null) return variants[0];
  const source = String(seed);
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return variants[hash % variants.length];
}

function buildGatewayPrompt(opts: {
  prompt: string;
  mode: GenerationMode;
  transparentBg?: boolean;
  style: string;
  colors?: { r: number; g: number; b: number }[];
  customStyleId?: string;
  maxLength?: number;
}) {
  const styleSafe = ALLOWED_STYLES.has(opts.style) ? opts.style : "digital_illustration";
  const palette = (opts.colors ?? [])
    .slice(0, 5)
    .map((c) => `rgb(${Math.max(0, Math.min(255, c.r | 0))}, ${Math.max(0, Math.min(255, c.g | 0))}, ${Math.max(0, Math.min(255, c.b | 0))})`)
    .join(", ");
  const extras = [
    opts.mode === "text"
      ? "Typography is critical. If text appears, render every character exactly as written, preserve Latvian diacritics perfectly, do not paraphrase, do not translate, do not add extra letters, keep the lettering fully legible, and treat the result as isolated apparel artwork rather than a poster, paper print, or framed composition."
      : "No accidental text, no gibberish letters, no watermark, no signature.",
    opts.transparentBg
      ? "Final asset must have a truly transparent background with no white box, no matte, no halo, no edge shadow, no drop shadow, and no background objects."
      : "If a background is unavoidable, use only a solid pure white background for clean masking. No poster background, no paper texture, no paper edges, and no framed scene.",
    `Visual style direction: ${styleSafe}.`,
    palette ? `Use this restrained print palette when possible: ${palette}.` : "Use a disciplined screen-print palette suited for apparel.",
    opts.customStyleId?.trim() ? `Honor this internal style reference when useful: ${opts.customStyleId.trim()}.` : "",
    "The output must be an isolated clean graphic, crisp screen-print style for apparel, centered, production-ready, with clean edges and strong silhouette.",
    "NEGATIVE: no border, no poster background, no paper texture, no paper edges, no drop shadows, no framed image, no frames, no photo-realistic clutter.",
  ].filter(Boolean).join(" ");
  // Per fal.ai OpenAPI schemas:
  //   - recraft-v3: maxLength = 1000 (HARD LIMIT, returns 422 above)
  //   - flux-pro/v1.1, flux/schnell, ideogram/v2, bytedance/seedream: no documented max
  // Caller passes the endpoint-specific cap so we don't needlessly truncate
  // when the model can handle a rich, detailed prompt.
  const cap = opts.maxLength ?? 4000;
  // Reserve ~40% of the budget for the style/quality/typography extras,
  // give the rest to the creative base prompt.
  const baseBudget = Math.max(200, Math.floor(cap * 0.6));
  const basePrompt = opts.prompt.length > baseBudget ? opts.prompt.slice(0, baseBudget) : opts.prompt;
  return `${basePrompt} ${extras}`.slice(0, cap);
}

async function falFetchImageBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Neizdevās lejupielādēt attēlu no fal.ai (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

async function falRemoveBackground(apiKey: string, imageUrl: string): Promise<string> {
  // Try the best available models in order. birefnet/v2 gives the cleanest
  // edges (no white halo); bria is a strong commercial fallback; the legacy
  // rembg is a last resort.
  const endpoints = [
    // Bria is the specialized commercial background-removal model — preferred
    // when the user explicitly asks for a transparent print file.
    { path: "fal-ai/bria/background/remove", body: { image_url: imageUrl } },
    { path: "fal-ai/birefnet/v2", body: { image_url: imageUrl, model: "General Use (Heavy)", operating_resolution: "2048x2048", output_format: "png", refine_foreground: true } },
    { path: "fal-ai/imageutils/rembg", body: { image_url: imageUrl } },
  ];
  let lastErr = "";
  for (const ep of endpoints) {
    try {
      const res = await fetch(`https://fal.run/${ep.path}`, {
        method: "POST",
        headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(ep.body),
      });
      if (!res.ok) {
        lastErr = `${ep.path} ${res.status}: ${(await res.text()).slice(0, 200)}`;
        console.warn("bg remover failed:", lastErr);
        continue;
      }
      const data = await res.json();
      const url: string | undefined = data?.image?.url ?? data?.images?.[0]?.url;
      if (!url) { lastErr = `${ep.path}: no url`; continue; }
      return url;
    } catch (e) {
      lastErr = `${ep.path}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  throw new Error(`fona noņemšana neizdevās: ${lastErr}`);
}

async function generateDesignImage(opts: {
  apiKey: string;
  prompt: string;
  style: string;
  customStyleId?: string;
  imageSize?: string;
  colors?: { r: number; g: number; b: number }[];
  transparentBg?: boolean;
  slogan?: string;
  model?: FalModelOverride;
}): Promise<{ bytes: Uint8Array; contentType: string; extension: string }> {
  const mode = resolveGenerationMode({ prompt: opts.prompt, slogan: opts.slogan, model: opts.model });
  const endpoint = resolveFalEndpoint({ mode, model: opts.model });
  // Endpoint-specific prompt cap. Only recraft-v3 documents a hard 1000-char limit.
  const promptCap = endpoint === "fal-ai/recraft-v3" ? 1000 : 4000;
  const prompt = buildGatewayPrompt({
    prompt: opts.prompt,
    mode,
    transparentBg: opts.transparentBg,
    style: opts.style,
    colors: opts.colors,
    customStyleId: opts.customStyleId,
    maxLength: promptCap,
  });
  const imageSize = ALLOWED_SIZES.has(opts.imageSize ?? "") ? opts.imageSize : "square_hd";

  // Per-endpoint request body. Recraft-v3 natively accepts our style tokens
  // and an RGB color palette; everyone else gets a generic flux-style body.
  const isRecraft = endpoint === "fal-ai/recraft-v3";
  const isIdeogramV3 = endpoint === "fal-ai/ideogram/v3";
  const body: Record<string, unknown> = isRecraft
    ? {
        prompt,
        image_size: imageSize,
        style: ALLOWED_STYLES.has(opts.style) && opts.style !== "any" ? opts.style : "digital_illustration",
        colors: (opts.colors ?? []).slice(0, 5).map((c) => ({
          r: Math.max(0, Math.min(255, c.r | 0)),
          g: Math.max(0, Math.min(255, c.g | 0)),
          b: Math.max(0, Math.min(255, c.b | 0)),
        })),
      }
    : isIdeogramV3
    ? {
        prompt,
        image_size: imageSize,
        num_images: 1,
        rendering_speed: "QUALITY",
        style: "DESIGN",
        expand_prompt: false,
      }
    : {
        prompt,
        image_size: imageSize,
        num_images: 1,
        enable_safety_checker: true,
      };

  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error("fal.ai šobrīd ir pārāk noslogots. Mēģini vēlreiz pēc brīža.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("fal.ai atslēga (FAL_KEY) nav derīga vai trūkst kredītu.");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal.ai ģenerēšana neizdevās (${res.status}): ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  let url: string | undefined = data?.images?.[0]?.url ?? data?.image?.url;
  if (!url) throw new Error("fal.ai neatgrieza attēla URL.");

  // Optional background removal pass for transparent print files.
  if (opts.transparentBg) {
    try {
      url = await falRemoveBackground(opts.apiKey, url);
    } catch (e) {
      console.warn("background removal failed, returning original:", e);
    }
  }

  const bytes = await falFetchImageBytes(url);
  const detected = detectImageAsset(bytes, "image/png");
  return {
    bytes,
    contentType: detected.contentType,
    extension: detected.extension,
  };
}

function buildPrompt(
  rawPrompt: string,
  style: string,
  transparent: boolean,
  opts: { slogan?: string; fitInFrame?: boolean; typographyVariant?: string } = {},
): string {
  const isVector = style.startsWith("vector_illustration");
  const isIllustration = style.startsWith("digital_illustration");
  // Keep the base prompt concise so the typography and print constraints stay dominant.
  // Strip any quoted strings — quoted Latvian text in the base prompt frequently
  // gets rendered by the image model as visible lettering on the artwork.
  const base = rawPrompt
    .replace(/["“”„«»‚'’][^"“”„«»‚'’]{0,80}["“”„«»‚'’]/g, "")
    .trim()
    .slice(0, 320);
  const slogan = opts.slogan?.trim().slice(0, 100);
  const typographyVariant = opts.typographyVariant?.trim();
  const bgHint = transparent
    ? "Isolated subject on a fully transparent background, no white box, no halo, no edge shadow, no drop shadow."
    : "Centered on a SOLID PURE WHITE background (#FFFFFF) for clean masking. No border, no paper texture, no paper edges, no frame, no vignette, no drop shadow.";
  // Frame-fit + quality rules, kept terse so total prompt stays under 1000 chars.
  const frameRule =
    "ISOLATED CLEAN VECTOR-STYLE GRAPHIC, crisp screen-print style for apparel. FLAT 2D ARTWORK ONLY. NOT a t-shirt, NOT a hoodie, NOT a garment, NOT a mockup, NOT a product photo, no fabric, no person, no model, no apparel. NOT a poster, NOT a framed print, NOT a postcard. Standalone design with 10% safe padding. DTF print file.";
  const qualityRule =
    "Premium editorial, gallery-grade, refined detail, boutique streetwear. " +
    "NEGATIVE: no drop shadows, no poster background, no paper edges, no paper texture, no photo-realistic clutter, no frames, no borders, no vignette, no scene, not childish, not infantile, not amateur, no clip-art, no stock, no kindergarten cartoon, no watermark, no signature.";

  // ===== Slogan / typography-led design =====
  if (slogan) {
    const out =
      `Typographic apparel artwork. The ONLY text in the image, spelled exactly: "${slogan}". ` +
      `MAXIMALLY ARTISTIC custom hand-lettering — NEVER use generic, standard, default or system fonts (no Helvetica, Arial, Inter, Roboto, Times, Impact, Bebas). ` +
      `Use this typography direction for this specific variation: ${typographyVariant || "daring expressive custom lettering with strong hierarchy"}. ` +
      `Pick a daring expressive lettering style: blackletter gothic, baroque flourished script, art-nouveau lettering, psychedelic 70s warped type, brutalist woodcut, distressed punk stencil, vintage Latvian folk ornament type, art-deco geometric, surreal melting type, riso-grain grunge, or hand-carved engraving. Choose ONE style that fits the mood and execute it with virtuoso craftsmanship — irregular weights, ligatures, custom swashes, decorative terminals, texture, character. Letters stacked in bold hierarchy and integrated as a clean shirt graphic. ` +
      `Decorative motif behind the text: ${base}. ` +
      `Artisan screen-print, 2–4 disciplined colors. ${bgHint} ${frameRule} ${qualityRule} ` +
      `Do NOT add any other words, banners, ribbons with text, signatures or watermarks — only the exact phrase "${slogan}".`;
    return out.slice(0, 990);
  }

  // ===== No slogan — pure illustration =====
  const styleHint = isVector
    ? "Bold confident flat vector, refined shapes, disciplined palette."
    : isIllustration
    ? "Sophisticated illustration, intricate detail, balanced composition."
    : "Premium screen-print artwork.";
  const out =
    `${base}. ${styleHint} ${bgHint} ${frameRule} ${qualityRule} ` +
    `Standalone sticker-style artwork. Absolutely no text, no letters, no words, no numbers, no watermark, no scene.`;
  return out.slice(0, 990);
}

/**
 * For Latvian slogans, append a character-by-character description of the
 * diacritic letters. This dramatically improves how text-capable image models
 * (ideogram, recraft) render macrons (ā ē ī ū ō) and commas/carons (č š ž ķ ļ ņ ģ).
 */
function spellLatvianDiacritics(slogan: string): string {
  const map: Record<string, string> = {
    "ā": "a with macron (ā)", "ē": "e with macron (ē)", "ī": "i with macron (ī)",
    "ū": "u with macron (ū)", "ō": "o with macron (ō)",
    "č": "c with caron (č)", "š": "s with caron (š)", "ž": "z with caron (ž)",
    "ģ": "g with comma below (ģ)", "ķ": "k with comma below (ķ)",
    "ļ": "l with comma below (ļ)", "ņ": "n with comma below (ņ)",
    "Ā": "A with macron (Ā)", "Ē": "E with macron (Ē)", "Ī": "I with macron (Ī)",
    "Ū": "U with macron (Ū)", "Ō": "O with macron (Ō)",
    "Č": "C with caron (Č)", "Š": "S with caron (Š)", "Ž": "Z with caron (Ž)",
    "Ģ": "G with comma below (Ģ)", "Ķ": "K with comma below (Ķ)",
    "Ļ": "L with comma below (Ļ)", "Ņ": "N with comma below (Ņ)",
  };
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const ch of slogan) {
    if (map[ch] && !seen.has(ch)) { seen.add(ch); parts.push(map[ch]); }
  }
  if (!parts.length) return "";
  return `Diacritic guide for the text: ${parts.join(", ")}. `;
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
      const typographyVariant = slogan ? getTypographyVariation(existing?.id ?? rawPrompt) : undefined;
      const finalPrompt = buildPrompt(rawPrompt, useStyle, useTransparent, {
        slogan,
        fitInFrame: campFitInFrame,
        typographyVariant,
      });

      try {
        const { bytes, contentType, extension } = await generateDesignImage({
          apiKey: FAL_KEY, prompt: finalPrompt, style: useStyle,
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
      const typographyVariant = slogan ? getTypographyVariation(`${campaign_id}:${i}:${idea.title}`) : undefined;
      const finalPrompt = buildPrompt(idea.prompt, useStyle, useTransparent, {
        slogan,
        fitInFrame: campFitInFrame,
        typographyVariant,
      });
      try {
        const { bytes, contentType, extension } = await generateDesignImage({
          apiKey: FAL_KEY, prompt: finalPrompt, style: useStyle,
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