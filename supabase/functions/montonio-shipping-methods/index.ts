import { corsHeaders, MONTONIO_SHIPPING_BASE, signMontonioJwt } from "../_shared/montonio.ts";

// Returns Omniva LV parcel-machine pickup points via Montonio Shipping V2
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = await signMontonioJwt({});
    const url = `${MONTONIO_SHIPPING_BASE}/api/shipping/v2/pickup-points?countryCodes=LT,LV,EE`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Montonio shipping error:", res.status, text);
      return new Response(JSON.stringify({ error: "Montonio shipping fetch failed", detail: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("montonio-shipping-methods error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});