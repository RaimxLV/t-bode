import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const { baseTitle, prompt, imageUrl } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    if (!apiKey) {
      return new Response(JSON.stringify({ name: null, error: "LOVABLE_API_KEY missing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Tu esi radošs latviešu kopirraitētājs. Izdomā ĪSU, poētisku dizaina nosaukumu latviski (2-4 vārdi, bez pēdiņām, bez emoji, bez numuriem, bez krekla modeļa vai zīmola nosaukuma, bez vārdiem "T-krekls" un "Krekls", bez kokvilnas pieminēšanas). Nosaukumam jāatspoguļo dizaina vizuālais saturs. Atgriez TIKAI dizaina nosaukumu vienā rindā.`;
    const userText = `Kampaņas tēma: ${baseTitle ?? "(nav)"}. Dizaina apraksts: ${prompt ?? "(nav)"}.`;
    const content: any[] = [{ type: "text", text: userText }];
    if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ name: null, error: `AI ${res.status}: ${txt}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.trim().split("\n")[0].replace(/^["'`]+|["'`]+$/g, "").trim();
    const name = cleaned.length >= 3 && cleaned.length <= 80 ? cleaned : null;
    return new Response(JSON.stringify({ name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ name: null, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});