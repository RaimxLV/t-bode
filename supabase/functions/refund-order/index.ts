// Refund an order — full refund only.
// - Stripe: refunds the PaymentIntent associated with stripe_session_id
// - Montonio: marks for manual refund (Montonio API requires manual flow in backoffice)
// - Bank transfer / manual: just marks order as refunded
// After refund: sets status='cancelled', records refunded metadata,
// generates a credit note (negative invoice version) automatically.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorization: admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    let isAdmin = false;
    if (token === SERVICE_KEY) {
      isAdmin = true;
    } else if (token) {
      const { data: userData } = await service.auth.getUser(token);
      if (userData?.user) {
        const { data: roleRow } = await service
          .from("user_roles").select("role")
          .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
        isAdmin = !!roleRow;
        if (!isAdmin && userData.user.email) {
          const { data: wl } = await service.rpc("is_admin_whitelisted", { _email: userData.user.email });
          isAdmin = !!wl;
        }
      }
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await service
      .from("orders").select("*").eq("id", order_id).maybeSingle();
    if (orderErr || !order) throw new Error("Order not found");

    if (order.status === "cancelled") {
      return new Response(JSON.stringify({ ok: false, error: "Order already cancelled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = order.provider || "stripe";
    let refundId: string | null = null;
    let refundProvider = provider;
    const refundAmount = Number(order.total);

    if (provider === "stripe" && order.stripe_session_id) {
      const stripe = createStripeClient();
      const session = await stripe.sessions.retrieve(order.stripe_session_id);
      const piId = session.payment_intent;
      if (!piId) throw new Error("No payment intent on this Stripe session");
      const refund = await stripe.refunds.create({
        payment_intent: piId,
        reason: "requested_by_customer",
      });
      refundId = refund.id;
    } else if (provider === "montonio") {
      // Montonio API does not expose programmatic refunds in this integration —
      // mark for manual refund in Montonio backoffice and continue with cancellation
      refundId = "MANUAL_MONTONIO";
    } else {
      // bank_transfer or manual — just record
      refundId = "MANUAL";
    }

    // Update order to cancelled with refund metadata
    await service
      .from("orders")
      .update({
        status: "cancelled" as any,
        notes: [order.notes, `[REFUND ${new Date().toISOString().slice(0, 10)}] ${refundProvider} ${refundId} amount €${refundAmount.toFixed(2)}`].filter(Boolean).join("\n"),
      })
      .eq("id", order_id);

    // Generate credit note (negative invoice — version bump with refund flag in notes)
    try {
      await service.functions.invoke("generate-invoice", {
        body: {
          order_id,
          force_new_version: true,
          notes: `KREDĪTRĒĶINS — pilna atmaksa €${refundAmount.toFixed(2)}. Refund ID: ${refundId}`,
        },
        headers: { Authorization: `Bearer ${SERVICE_KEY}` },
      });
    } catch (e) {
      console.error("Credit note generation failed:", (e as Error).message);
    }

    return new Response(JSON.stringify({ ok: true, refund_id: refundId, amount: refundAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refund-order error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});