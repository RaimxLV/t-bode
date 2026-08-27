import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Generates a photorealistic cover image for one article and saves it as the cover. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const key = Deno.env.get("LOVABLE_API_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key || !url || !serviceKey) throw new Error("AI vai datubāzes konfigurācija nav pieejama");

    const body = await req.json().catch(() => ({}));
    const postId = typeof body?.post_id === "string" ? body.post_id : "";
    const extra = typeof body?.instruction === "string" ? body.instruction.slice(0, 500) : "";
    if (!postId) throw new Error("Nav norādīts raksta ID");

    const admin = createClient(url, serviceKey);
    const { data: post, error: postError } = await admin
      .from("blog_posts").select("id,title,excerpt").eq("id", postId).maybeSingle();
    if (postError) throw postError;
    if (!post) throw new Error("Raksts nav atrasts");

    // Vary the scene so covers don't all look like the same print workshop.
    const scenes = [
      "a young couple at home unwrapping a gift box with a printed t-shirt, cosy living room, morning light",
      "a wedding party outdoors in summer, bride and groom with friends wearing fun matching printed t-shirts, candid laughter",
      "a group of friends at a birthday celebration in a bright apartment, custom printed shirts, confetti, natural light",
      "a school class or sports team outdoors wearing matching printed t-shirts, group photo energy, late afternoon sun",
      "a parent and child in a kitchen, both wearing matching printed t-shirts, warm domestic scene",
      "a close-up flat lay of a folded printed t-shirt, hoodie and mug on a linen surface with plants and coffee",
      "a small team in a modern Northern European office celebrating with branded hoodies, relaxed candid moment",
      "a person walking a city street in Riga wearing a printed hoodie, street photography feel, soft overcast light",
      "a cosy laundry or bathroom scene with a printed t-shirt being cared for, soft tones, no text on labels",
      "a market or festival stall scene with people wearing personalised tote bags and shirts, lively but natural",
    ];
    const scene = scenes[Math.floor(Math.random() * scenes.length)];
    const moods = [
      "documentary candid photography, natural imperfect moment",
      "editorial lifestyle photography, shallow depth of field",
      "bright airy film photography look, soft grain",
      "warm golden hour photography, gentle lens flare",
    ];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    const prompt = `Photorealistic editorial photograph for a Latvian lifestyle article about personalised apparel.
Article title (Latvian): "${post.title}".
${post.excerpt ? `Context: ${post.excerpt}` : ""}
Scene: ${scene}. Choose the framing and composition that best fits the article title; if the title suggests a different situation, follow the title instead of the scene.
Style: ${mood}, 35mm or 50mm lens look, real people of varied ages, authentic clothing, crisp detail, no text, no letters, no logos, no watermarks, no illustration, no 3D render.
Avoid: print shops, printing machines, heat presses, workshops, industrial interiors, studio backdrops, stacks of blank garments.${
      extra ? `\nAdditional direction: ${extra}` : ""
    }`;


    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (aiRes.status === 429) throw new Error("AI pieprasījumu limits. Mēģini pēc brīža.");
    if (aiRes.status === 402) throw new Error("AI kredīti ir beigušies.");
    if (!aiRes.ok) throw new Error(`AI kļūda ${aiRes.status}: ${(await aiRes.text()).slice(0, 200)}`);

    const aiData = await aiRes.json();
    const b64 = aiData?.data?.[0]?.b64_json;
    if (!b64) throw new Error("AI neatgrieza bildi");

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `blog/${postId}-ai-${Date.now()}.png`;
    const { error: upErr } = await admin.storage
      .from("product-images")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);

    const { error: updErr } = await admin
      .from("blog_posts").update({ cover_image_url: pub.publicUrl }).eq("id", postId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true, cover_image_url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-article-image error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Nezināma kļūda" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});