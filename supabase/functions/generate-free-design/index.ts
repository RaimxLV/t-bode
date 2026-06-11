import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FalModel =
  | "auto"
  | "ideogram"
  | "recraft"
  | "flux-pro"
  | "flux-schnell"
  | "seedream"
  | "nano-banana"
  | "openai/gpt-image-2"
  | "openai/gpt-image-1-mini";

interface Body {
  prompt: string;
  count?: number;
  image_size?: string;
  model?: FalModel;
  transparent_bg?: boolean;
  category_id?: string | null;
}

const ALLOWED_SIZES = new Set([
  "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9",
]);

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function toOpenAiSize(s: string): "1024x1024" | "1024x1536" | "1536x1024" {
  switch (s) {
    case "portrait_4_3":
    case "portrait_16_9":
      return "1024x1536";
    case "landscape_4_3":
    case "landscape_16_9":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}

async function genOpenAi(opts: { prompt: string; image_size: string; model: "openai/gpt-image-2" | "openai/gpt-image-1-mini"; transparent_bg?: boolean }): Promise<{ bytes: Uint8Array; contentType: string; extension: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY nav konfigurēts");
  const prompt = buildPrompt(opts.prompt, !!opts.transparent_bg);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "edge-function" },
    body: JSON.stringify({
      model: opts.model,
      prompt,
      size: toOpenAiSize(opts.image_size),
      quality: "medium",
      n: 1,
    }),
  });
  if (res.status === 429) throw new Error("Lovable AI: pārāk daudz pieprasījumu. Mēģini vēlāk.");
  if (res.status === 402) throw new Error("Lovable AI kredīti beigušies. Papildini workspace billing.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64: string | undefined = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Lovable AI neatgrieza attēlu");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { bytes, contentType: "image/png", extension: "png" };
}

function resolveEndpoint(model: FalModel | undefined, hasLatvian: boolean): string {
  switch (model) {
    case "ideogram": return "fal-ai/ideogram/v3";
    case "flux-pro": return "fal-ai/flux-pro/v1.1";
    case "flux-schnell": return "fal-ai/flux/schnell";
    case "seedream": return "fal-ai/bytedance/seedream/v3/text-to-image";
    case "nano-banana": return "fal-ai/gemini-25-flash-image";
    case "recraft": return "fal-ai/recraft-v3";
    case "auto":
    default:
      return hasLatvian ? "fal-ai/ideogram/v3" : "fal-ai/recraft-v3";
  }
}

function buildPrompt(raw: string, transparent: boolean): string {
  const base = raw.trim().slice(0, 700);
  const bg = transparent
    ? "Isolated subject on a fully transparent background, no white box, no halo, no edge shadow."
    : "Clean simple background.";
  const frame =
    "FLAT 2D ARTWORK ONLY. NOT a t-shirt, NOT a hoodie, NOT a mockup, no fabric, no person, no model. Standalone design that FILLS the frame edge-to-edge, no internal margins, no safe padding, no border. DTF print file.";
  const quality =
    "Premium gallery-grade illustration, refined detail, boutique streetwear. NEGATIVE: no clip-art, no stock, no kindergarten cartoon, no watermark, no signature.";
  return `${base}. ${bg} ${frame} ${quality}`.slice(0, 990);
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Neizdevās lejupielādēt bildi (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

function detectExt(bytes: Uint8Array): { contentType: string; extension: string } {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return { contentType: "image/png", extension: "png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { contentType: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[8] === 0x57) return { contentType: "image/webp", extension: "webp" };
  return { contentType: "image/png", extension: "png" };
}

async function genOne(apiKey: string, opts: { prompt: string; image_size: string; model?: FalModel; transparent_bg?: boolean }): Promise<{ bytes: Uint8Array; contentType: string; extension: string }> {
  // OpenAI models routed through Lovable AI Gateway
  if (opts.model === "openai/gpt-image-2" || opts.model === "openai/gpt-image-1-mini") {
    let out = await genOpenAi({ prompt: opts.prompt, image_size: opts.image_size, model: opts.model, transparent_bg: opts.transparent_bg });
    if (opts.transparent_bg) {
      try {
        // Upload temp to data URL? birefnet needs an URL. Use base64 data URL.
        const dataUrl = `data:image/png;base64,${bytesToBase64(out.bytes)}`;
        const bgRes = await fetch("https://fal.run/fal-ai/birefnet/v2", {
          method: "POST",
          headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: dataUrl, operating_resolution: "2048x2048", output_format: "png", refine_foreground: true }),
        });
        if (bgRes.ok) {
          const bgData = await bgRes.json();
          const newUrl = bgData?.image?.url ?? bgData?.images?.[0]?.url;
          if (newUrl) {
            let bytes = await fetchBytes(newUrl);
            try { bytes = await trimTransparent(bytes); } catch (e) { console.warn("trim failed:", e); }
            return { bytes, contentType: "image/png", extension: "png" };
          }
        }
      } catch (e) {
        console.warn("openai bg-remove failed (keeping original):", e);
      }
    }
    return out;
  }

  const hasLatvian = /[āēīōūčšžķļņģ]/i.test(opts.prompt);
  const endpoint = resolveEndpoint(opts.model, hasLatvian);
  const prompt = buildPrompt(opts.prompt, !!opts.transparent_bg);
  const isRecraft = endpoint === "fal-ai/recraft-v3";
  const isIdeogramV3 = endpoint === "fal-ai/ideogram/v3";
  const body: Record<string, unknown> = isRecraft
    ? { prompt, image_size: opts.image_size, style: "digital_illustration" }
    : isIdeogramV3
    ? { prompt, image_size: opts.image_size, num_images: 1, rendering_speed: "QUALITY", style: "DESIGN", expand_prompt: false }
    : { prompt, image_size: opts.image_size, num_images: 1, enable_safety_checker: true };

  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("fal.ai šobrīd ir pārāk noslogots.");
  if (res.status === 401 || res.status === 403) throw new Error("fal.ai atslēga (FAL_KEY) nav derīga.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal.ai (${res.status}): ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  let url: string | undefined = data?.images?.[0]?.url ?? data?.image?.url;
  if (!url) throw new Error("fal.ai neatgrieza attēla URL.");

  if (opts.transparent_bg) {
    try {
      const bgRes = await fetch("https://fal.run/fal-ai/birefnet/v2", {
        method: "POST",
        headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url, operating_resolution: "2048x2048", output_format: "png", refine_foreground: true }),
      });
      if (bgRes.ok) {
        const bgData = await bgRes.json();
        const newUrl = bgData?.image?.url ?? bgData?.images?.[0]?.url;
        if (newUrl) url = newUrl;
      }
    } catch (e) {
      console.warn("bg-remove failed (keeping original):", e);
    }
  }

  let bytes = await fetchBytes(url);
  if (opts.transparent_bg) {
    try {
      bytes = await trimTransparent(bytes);
    } catch (e) {
      console.warn("trim failed (keeping original):", e);
    }
    return { bytes, contentType: "image/png", extension: "png" };
  }
  return { bytes, ...detectExt(bytes) };
}

async function trimTransparent(bytes: Uint8Array, alphaThreshold = 16, whiteCutoff = 238): Promise<Uint8Array> {
  const img = await Image.decode(bytes);
  const w = img.width, h = img.height;
  // Halo cleanup: near-white semi-transparent pixels -> fully transparent
  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      const px = img.getPixelAt(x, y);
      const r = (px >>> 24) & 0xff;
      const g = (px >>> 16) & 0xff;
      const b = (px >>> 8) & 0xff;
      const a = px & 0xff;
      if (a === 0) continue;
      const nearWhite = r >= whiteCutoff && g >= whiteCutoff && b >= whiteCutoff;
      if (nearWhite && a < 250) img.setPixelAt(x, y, 0);
      else if (a < alphaThreshold) img.setPixelAt(x, y, 0);
    }
  }
  // Tight bbox of opaque pixels
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = img.getPixelAt(x + 1, y + 1) & 0xff;
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return await img.encode();
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === w && ch === h) return await img.encode();
  return await img.clone().crop(minX, minY, cw, ch).encode();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response;

  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "FAL_KEY nav konfigurēts" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Nederīgs JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 3) {
    return new Response(JSON.stringify({ error: "Apraksts pārāk īss" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const count = Math.max(1, Math.min(8, body.count ?? 1));
  const image_size = ALLOWED_SIZES.has(body.image_size ?? "") ? body.image_size! : "square_hd";

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const tags = ["studio"];
  if (body.transparent_bg) tags.push("transparent");

  const results: Array<{ ok: boolean; id?: string; file_path?: string; error?: string }> = [];

  for (let i = 0; i < count; i++) {
    try {
      const out = await genOne(apiKey, {
        prompt, image_size, model: body.model, transparent_bg: body.transparent_bg,
      });
      const id = crypto.randomUUID();
      const name = prompt.slice(0, 60);
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "ai-design";
      const path = `studio/${id}-${safeName}.${out.extension}`;
      const up = await admin.storage.from("design-library").upload(path, out.bytes, {
        contentType: out.contentType, upsert: false,
      });
      if (up.error) throw up.error;
      const { data: row, error: dbErr } = await admin.from("design_library").insert({
        name,
        file_path: path,
        file_size: out.bytes.byteLength,
        category_id: body.category_id ?? null,
        tags,
      }).select("id, file_path").maybeSingle();
      if (dbErr) throw dbErr;
      results.push({ ok: true, id: row?.id, file_path: row?.file_path });
    } catch (e: any) {
      console.error("free-design gen failed:", e);
      results.push({ ok: false, error: e?.message ?? String(e) });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;

  return new Response(JSON.stringify({ ok, failed, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});