import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, MONTONIO_PAYMENTS_BASE, signMontonioJwt } from "../_shared/montonio.ts";

// Creates a Montonio payment order with bank-link payment method.
// Includes notification_url so Montonio posts webhooks to our function.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      order_id,
      items,
      origin_url,
      customer_email,
      customer_name,
      customer_phone,
      preferred_provider, // bank handle e.g. "swedbank", "seb", "luminor", "citadele"
      shipping, // optional: { method: "omniva-pakomat", pickupPointId, pickupPointName }
    } = body ?? {};

    if (!order_id || !Array.isArray(items) || items.length === 0 || !customer_email) {
      return new Response(JSON.stringify({ error: "Missing order_id, items or customer_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Compute amount on the server from items (don't trust client total blindly).
    const itemsTotal = items.reduce(
      (sum: number, it: any) => sum + Number(it.price) * Number(it.quantity || 1),
      0
    );
    const shippingCost = Number(items[0]?.shippingCost ?? 0);
    const grandTotal = Math.round((itemsTotal + shippingCost) * 100) / 100;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const notificationUrl = `${supabaseUrl}/functions/v1/montonio-webhook`;
    const returnUrl = `${origin_url}/payment-success?order_id=${order_id}&method=montonio`;

    const merchantReference = order_id;

    const payload: Record<string, unknown> = {
      merchantReference,
      returnUrl,
      notificationUrl,
      currency: "EUR",
      grandTotal,
      locale: "lv",
      payment: {
        method: "paymentInitiation",
        methodDisplay: "Pay with your bank",
        amount: grandTotal,
        currency: "EUR",
        methodOptions: {
          paymentDescription: `Order #${order_id.slice(0, 8).toUpperCase()}`,
          ...(preferred_provider ? { preferredProvider: preferred_provider } : {}),
          preferredCountry: "LV",
        },
      },
      billingAddress: {
        firstName: (customer_name ?? "").split(" ")[0] || "Customer",
        lastName: (customer_name ?? "").split(" ").slice(1).join(" ") || "-",
        email: customer_email,
        phoneNumber: customer_phone ?? "",
        addressLine1: "-",
        locality: "-",
        region: "-",
        country: "LV",
        postalCode: "-",
      },
      lineItems: items.map((it: any) => ({
        name: it.name,
        quantity: Number(it.quantity || 1),
        finalPrice: Number(it.price),
      })),
    };

    if (shipping?.method) {
      (payload as any).shipping = {
        method: shipping.method, // e.g. "omniva-pakomat"
        pickupPoint: shipping.pickupPointId
          ? { id: shipping.pickupPointId, name: shipping.pickupPointName ?? "" }
          : undefined,
      };
    }

    const jwt = await signMontonioJwt(payload);

    const res = await fetch(`${MONTONIO_PAYMENTS_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: jwt }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Montonio create order error:", res.status, text);
      return new Response(JSON.stringify({ error: "Montonio order creation failed", detail: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const json = JSON.parse(text);
    const paymentUrl: string | undefined = json.paymentUrl ?? json.payment_url;
    const montonioUuid: string | undefined = json.uuid ?? json.orderUuid;

    await service
      .from("orders")
      .update({
        provider: "montonio",
        montonio_order_uuid: montonioUuid ?? null,
        montonio_payment_status: "PENDING",
        montonio_payment_method: "paymentInitiation",
        montonio_shipping_method_code: shipping?.method ?? null,
        montonio_pickup_point_id: shipping?.pickupPointId ?? null,
        montonio_pickup_point_name: shipping?.pickupPointName ?? null,
      })
      .eq("id", order_id);

    return new Response(JSON.stringify({ url: paymentUrl, uuid: montonioUuid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("montonio-create-order error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});