import { corsHeaders, MONTONIO_SHIPPING_BASE, signMontonioJwt } from "../_shared/montonio.ts";

// Returns parcel-machine pickup points via Montonio Shipping V2.
// Flow:
//   1. GET /api/v2/shipping-methods  -> list active carriers with pickupPoint methods
//   2. For each carrier offering parcelMachine in the requested country, fetch
//      GET /api/v2/shipping-methods/pickup-points?carrierCode=...&countryCode=...&type=parcelMachine
// Returns: { items: [{ carrierCode, countryCode, pickupPoints: [...] }] }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    const country = (reqUrl.searchParams.get("country") ?? "LV").toLowerCase();

    // Bearer JWT for the Shipping API.
    const token = await signMontonioJwt({});
    const authHeader = { Authorization: `Bearer ${token}`, Accept: "application/json" };

    // 1. Fetch all activated shipping methods (per country, per carrier)
    const methodsRes = await fetch(`${MONTONIO_SHIPPING_BASE}/api/v2/shipping-methods`, {
      headers: authHeader,
    });
    if (!methodsRes.ok) {
      const text = await methodsRes.text();
      console.error("Montonio /shipping-methods error:", methodsRes.status, text);
      return new Response(
        JSON.stringify({ error: "Montonio shipping fetch failed", detail: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }
    const methodsData = await methodsRes.json();

    // Find carriers that offer parcelMachine pickup in the requested country.
    const carrierCodes = new Set<string>();
    const countries: any[] = methodsData?.countries ?? [];
    for (const c of countries) {
      if ((c?.countryCode ?? "").toLowerCase() !== country) continue;
      for (const carrier of c?.carriers ?? []) {
        const offersParcelMachine = (carrier?.shippingMethods ?? []).some(
          (m: any) =>
            m?.type === "pickupPoint" &&
            (m?.subtypes ?? []).some((s: any) => s?.code === "parcelMachine"),
        );
        if (offersParcelMachine && carrier?.carrierCode) {
          carrierCodes.add(carrier.carrierCode);
        }
      }
    }

    // 2. Fetch pickup points for each carrier in parallel.
    const items: Array<{ carrierCode: string; countryCode: string; pickupPoints: any[] }> = [];
    await Promise.all(
      Array.from(carrierCodes).map(async (carrierCode) => {
        const u = `${MONTONIO_SHIPPING_BASE}/api/v2/shipping-methods/pickup-points?carrierCode=${encodeURIComponent(
          carrierCode,
        )}&countryCode=${encodeURIComponent(country)}&type=parcelMachine`;
        const r = await fetch(u, { headers: authHeader });
        if (!r.ok) {
          const t = await r.text();
          console.warn(`Pickup points fetch failed for ${carrierCode}:`, r.status, t);
          return;
        }
        const j = await r.json();
        const pts = j?.pickupPoints ?? [];
        if (Array.isArray(pts) && pts.length > 0) {
          items.push({ carrierCode, countryCode: country.toUpperCase(), pickupPoints: pts });
        }
      }),
    );

    return new Response(JSON.stringify({ items }), {
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