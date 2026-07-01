import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Vai aizmirsi pabeigt pasūtījumu?" : "Did you forget to complete your order?",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro: lang === "lv"
    ? "Pamanījām, ka Tavs pasūtījums palika nepabeigts. Prece(s) joprojām gaida — pabeidz apmaksu, un mēs sāksim ražošanu."
    : "We noticed you didn't finish checking out. Your items are still waiting — complete payment and we'll start production.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  total: lang === "lv" ? "Summa" : "Amount",
  cta: lang === "lv" ? "Pabeigt pasūtījumu" : "Complete order",
  help: lang === "lv"
    ? "Ja rodas jautājumi — atbildi šai vēstulei, mēs palīdzēsim."
    : "Any questions? Just reply to this email, we're happy to help.",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function renderHtml(order: any, checkoutUrl: string, lang: Lang) {
  const tr = t(lang);
  const ref = `#${String(order.order_number).padStart(5, "0")}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:20px;margin:0 0 12px;color:#DC2626;">${tr.subject}</h2>
    <p style="margin:0 0 12px;">${tr.hi}${order.shipping_name ? `, ${order.shipping_name}` : ""}!</p>
    <p style="margin:0 0 16px;line-height:1.5;">${tr.intro}</p>
    <p style="margin:0 0 4px;"><strong>${tr.orderNo}</strong> ${ref}</p>
    <p style="margin:0 0 20px;"><strong>${tr.total}:</strong> €${Number(order.total).toFixed(2)}</p>
    <p style="margin:0 0 24px;">
      <a href="${checkoutUrl}" style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;">${tr.cta}</a>
    </p>
    <p style="margin:12px 0;color:#555;line-height:1.5;">${tr.help}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({} as any));
    const singleOrderId: string | undefined = body?.order_id;

    // Site URL for CTA button
    const siteUrl = Deno.env.get("SITE_URL") || "https://t-bode.lv";

    const sendOne = async (order: any, lang: Lang) => {
      let recipientEmail: string | null = order.guest_email;
      if (!recipientEmail && order.user_id) {
        const { data: u } = await service.auth.admin.getUserById(order.user_id);
        recipientEmail = u?.user?.email ?? null;
      }
      if (!recipientEmail) return { skipped: true, reason: "no email" };

      const html = renderHtml(order, `${siteUrl}/checkout`, lang);
      const subject = `${t(lang).subject} #${String(order.order_number).padStart(5, "0")}`;

      const result = await sendLovableTransactional(service, {
        template: "abandoned-checkout-reminder",
        to: recipientEmail,
        subject,
        html,
        idempotencyKey: `abandoned-checkout-${order.id}`,
        metadata: { order_id: order.id, order_number: order.order_number, lang },
      });
      if (!result.ok) return { sent: false, error: result.error };

      await service
        .from("orders")
        .update({ abandoned_reminder_sent_at: new Date().toISOString() } as any)
        .eq("id", order.id);
      return { sent: true, to: recipientEmail };
    };

    if (singleOrderId) {
      const { data: order } = await service
        .from("orders")
        .select("id, order_number, total, guest_email, user_id, shipping_name")
        .eq("id", singleOrderId)
        .maybeSingle();
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await sendOne(order, "lv");
      return new Response(JSON.stringify(r), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cron mode: find abandoned Montonio orders 1-48h old with no reminder yet.
    const { data: orders } = await service
      .from("orders")
      .select("id, order_number, total, guest_email, user_id, shipping_name, created_at, abandoned_reminder_sent_at, montonio_payment_status, status")
      .in("payment_method", ["montonio", "montonio_card"])
      .eq("montonio_payment_status", "ABANDONED")
      .is("abandoned_reminder_sent_at", null)
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .lte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    let sent = 0, skipped = 0;
    for (const o of orders ?? []) {
      const r = await sendOne(o, "lv");
      if ((r as any).sent) sent++; else skipped++;
    }

    return new Response(JSON.stringify({ sent, skipped, total: orders?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-abandoned-checkout-reminder error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});