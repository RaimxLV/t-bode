import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "design-library";

async function falRemoveBackground(apiKey: string, imageUrl: string): Promise<string> {
  const endpoints = [
    { path: "fal-ai/birefnet/v2", body: { image_url: imageUrl, model: "General Use (Heavy)", output_format: "png" } },
    { path: "fal-ai/bria/background/remove", body: { image_url: imageUrl } },
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
        const bytes = new Uint8Array(await imgRes.arrayBuffer());

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