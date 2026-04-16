import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory cache (per isolate). Locations data changes rarely.
let cache: { data: unknown; expires: number } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (cache && cache.expires > Date.now()) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const upstream = await fetch("https://www.omniva.lv/locations.json");
    if (!upstream.ok) {
      throw new Error(`Omniva upstream returned ${upstream.status}`);
    }
    const data = await upstream.json();
    cache = { data, expires: Date.now() + TTL_MS };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err: any) {
    console.error("Omniva proxy error:", err.message);
    // If we have stale cache, serve it as fallback
    if (cache) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
      });
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
