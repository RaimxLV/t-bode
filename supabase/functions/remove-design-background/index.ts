import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "design-library";

/**
 * Crop fully-transparent borders from a PNG so the design fills the canvas.
 * Adds a small safe padding so edges aren't flush against the bitmap edge.
 */
async function trimTransparentPng(bytes: Uint8Array, alphaThreshold = 8, padPct = 0.02): Promise<Uint8Array> {
  const img = await Image.decode(bytes);
  const w = img.width, h = img.height;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = img.getPixelAt(x + 1, y + 1); // 1-indexed RGBA
      const a = px & 0xff;
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return bytes; // fully transparent — leave alone
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === w && ch === h) return bytes;
  const pad = Math.round(Math.max(cw, ch) * padPct);
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, minY - pad);
  const x1 = Math.min(w, maxX + 1 + pad);
  const y1 = Math.min(h, maxY + 1 + pad);
  const cropped = img.clone().crop(x0, y0, x1 - x0, y1 - y0);
  return await cropped.encode();
}

async function falRemoveBackground(apiKey: string, imageUrl: string): Promise<string> {
  // Highest-quality first. We intentionally avoid weaker fallbacks (bria/rembg)
  // because they often produce blocky / halo edges on logos and text.
  const endpoints = [
    {
      path: "fal-ai/birefnet/v2",
      body: {
        image_url: imageUrl,
        model: "General Use (Heavy)",
        operating_resolution: "2048x2048",
        output_format: "png",
        output_mask: false,
        refine_foreground: true,
      },
    },
    {
      // Same model, slightly lower res — used only if 2048 times out
      path: "fal-ai/birefnet/v2",
      body: {
        image_url: imageUrl,
        model: "General Use (Heavy)",
        operating_resolution: "1024x1024",
        output_format: "png",
        refine_foreground: true,
      },
    },
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
  throw new Error(`Fona noņemšana neizdevās: ${lastErr}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const FAL_KEY = Deno.env.get("FAL_KEY") ?? "";
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  const auth = await requireAdmin(req, corsHeaders, svc);
  if (!auth.ok) return auth.response;

  if (!FAL_KEY) {
    return new Response(JSON.stringify({ error: "FAL_KEY nav konfigurēts" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.design_ids) ? body.design_ids.filter((x: unknown) => typeof x === "string") : [];
    const replace: boolean = body?.replace !== false; // default true: overwrite original
    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "design_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows, error: selErr } = await svc
      .from("design_library")
      .select("id, name, file_path, category_id")
      .in("id", ids);
    if (selErr) throw selErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Nav atrasti dizaini" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; ok: boolean; error?: string; file_path?: string }> = [];

    for (const row of rows) {
      try {
        const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(row.file_path);
        const sourceUrl = pub.publicUrl;
        const cleanedUrl = await falRemoveBackground(FAL_KEY, sourceUrl);
        const imgRes = await fetch(cleanedUrl);
        if (!imgRes.ok) throw new Error(`Nevar lejupielādēt rezultātu (${imgRes.status})`);
        let bytes = new Uint8Array(await imgRes.arrayBuffer());
        try {
          bytes = await trimTransparentPng(bytes);
        } catch (e) {
          console.warn("trim transparent failed (keeping uncropped):", e);
        }

        const baseName = (row.name || "design").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
        let newPath: string;
        if (replace) {
          const dir = row.file_path.includes("/") ? row.file_path.split("/").slice(0, -1).join("/") : (row.category_id ?? "uncat");
          const stamp = Date.now();
          newPath = `${dir}/${baseName}-nobg-${stamp}.png`;
        } else {
          const dir = row.category_id ?? "uncat";
          newPath = `${dir}/${crypto.randomUUID()}-${baseName}-nobg.png`;
        }

        const { error: upErr } = await svc.storage.from(BUCKET).upload(newPath, bytes, {
          contentType: "image/png", upsert: true,
        });
        if (upErr) throw upErr;

        if (replace && newPath !== row.file_path) {
          await svc.storage.from(BUCKET).remove([row.file_path]).catch(() => {});
        }

        if (replace) {
          await svc.from("design_library").update({
            file_path: newPath, file_size: bytes.byteLength,
          }).eq("id", row.id);
        } else {
          await svc.from("design_library").insert({
            name: `${row.name} (no bg)`,
            file_path: newPath,
            category_id: row.category_id,
            file_size: bytes.byteLength,
            tags: [],
          });
        }

        results.push({ id: row.id, ok: true, file_path: newPath });
      } catch (e) {
        results.push({ id: row.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ ok, failed: results.length - ok, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});