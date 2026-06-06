import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  image_url: string;
  /** Target longest edge in px. Capped at 4096. Default 3072. */
  target_long_edge?: number;
}

/**
 * Upscale a design via fal.ai clarity-upscaler. Returns the upscaled image
 * as a public URL (the fal CDN URL). Client code can then fetch + post-process
 * (transparency, DPI metadata) before download.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const { image_url, target_long_edge = 3072 }: Body = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) {
      return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // clarity-upscaler accepts upscale_factor 1..4; choose smallest factor that hits target
    const factor = Math.max(2, Math.min(4, Math.ceil(target_long_edge / 1024)));

    const res = await fetch("https://fal.run/fal-ai/clarity-upscaler", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url,
        upscale_factor: factor,
        creativity: 0.2,
        resemblance: 1.5,
        prompt: "masterpiece, ultra detailed, sharp, high resolution, print quality",
        negative_prompt: "blurry, low quality, jpeg artifacts, noise",
        num_inference_steps: 18,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `upscaler ${res.status}: ${t.slice(0, 300)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const url: string | undefined = data?.image?.url ?? data?.images?.[0]?.url;
    if (!url) {
      return new Response(JSON.stringify({ error: "upscaler: no image url" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ url, factor }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});