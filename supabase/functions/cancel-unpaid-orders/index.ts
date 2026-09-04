import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/service-role-auth.ts";
import { businessDaysSince, PAYMENT_TERM_BUSINESS_DAYS } from "../_shared/business-days.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/**
 * Cancels online-payment orders (Montonio / Stripe card) that are still
 * `pending` after 5 business days — i.e. the customer never completed payment.
 * Bank-transfer orders are left alone: they follow the payment-reminder flow
 * (2 polite reminders, then cancellation on the same 5-business-day term).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = requireServiceRole(req, corsHeaders);
  if (!guard.ok) return guard.response;

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Coarse pre-filter (5 business days are never fewer than 5 calendar days),
    // then the exact business-day check happens in JS below.
    const cutoff = new Date(Date.now() - PAYMENT_TERM_BUSINESS_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await service
      .from("orders")
      .select(
        "id, order_number, payment_method, provider, created_at, montonio_order_uuid, stripe_session_id, montonio_payment_status, manually_paid_at, guest_email, user_id",
      )
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .is("manually_paid_at", null);
    if (error) throw error;

    const isOnline = (o: any) =>
      o.payment_method !== "bank_transfer" &&
      o.payment_method !== "bank" &&
      o.provider !== "bank_transfer";
    const isPaid = (o: any) =>
      String(o.montonio_payment_status ?? "").toUpperCase() === "PAID";

    const targets = (orders ?? []).filter(
      (o) =>
        isOnline(o) &&
        !isPaid(o) &&
        businessDaysSince(o.created_at) >= PAYMENT_TERM_BUSINESS_DAYS,
    );


    let cancelled = 0;
    let emailed = 0;
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    for (const o of targets) {
      const { error: upErr } = await service
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", o.id)
        .eq("status", "pending");
      if (upErr) {
        console.error("cancel failed", o.order_number, upErr.message);
        continue;
      }
      cancelled++;

      // Only notify customers who actually reached the payment gateway —
      // never-started checkouts get no email, to avoid spam.
      const reachedGateway = Boolean(o.montonio_order_uuid || o.stripe_session_id);
      const hasEmail = Boolean(o.guest_email || o.user_id);
      if (reachedGateway && hasEmail) {
        try {
          const res = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-cancelled`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-cron-secret": cronSecret,
                apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
              },
              body: JSON.stringify({ order_id: o.id, lang: "lv" }),
            },
          );
          if (res.ok) emailed++;
          else console.error("email failed", o.order_number, await res.text());
        } catch (e) {
          console.error("email error", o.order_number, (e as Error).message);
        }
      }
    }

    console.log(`cancel-unpaid-orders: cancelled=${cancelled} emailed=${emailed}`);
    return new Response(
      JSON.stringify({ checked: orders?.length ?? 0, cancelled, emailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cancel-unpaid-orders error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
