import { corsHeaders, MONTONIO_SHIPPING_BASE, signMontonioJwt } from "../_shared/montonio.ts";

// Returns Omniva / parcel-machine pickup points via Montonio Shipping V2.
// Montonio Shipping V2 exposes shipping methods (with embedded pickup points)
// at POST /api/shipping-v2/shipping-methods, authenticated with a signed JWT.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const country = (url.searchParams.get("country") ?? "LV").toUpperCase();

    // Signed JWT body — Shipping V2 expects merchant context inside the token.
    const token = await signMontonioJwt({
      address: {
        country,
      },
    });

    const endpoint = `${MONTONIO_SHIPPING_BASE}/api/shipping-v2/shipping-methods`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: token }),
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

    // Normalize: flatten pickup points across all carriers into one list,
    // tagged with their carrierCode so the client can show them grouped if needed.
    const items: any[] = [];
    const carriers = (data?.shippingMethods ?? data?.data ?? []) as any[];
    for (const method of carriers) {
      const carrierCode = method?.carrier ?? method?.carrierCode ?? method?.code ?? null;
      const points = method?.pickupPoints ?? [];
      if (Array.isArray(points) && points.length > 0) {
        items.push({
          carrierCode,
          countryCode: country,
          pickupPoints: points,
        });
      }
    }

    return new Response(JSON.stringify({ items, raw: data }), {
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