import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { logEmailAttempt, makeMessageId } from "../_shared/email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "T-Bode <onboarding@resend.dev>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Pasūtījums atcelts" : "Order cancelled",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? "Diemžēl Tavs pasūtījums ir atcelts."
      : "Unfortunately, your order has been cancelled.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  refund:
    lang === "lv"
      ? "Ja maksājums jau bija veikts, atmaksa tiks veikta uz to pašu kontu 5–10 darba dienu laikā."
      : "If a payment was made, a refund will be issued to the same account within 5–10 business days.",
  questions:
    lang === "lv"
      ? "Ja Tev ir jautājumi, atbildi uz šo e-pastu vai raksti mums uz eriks@ervitex.lv."
      : "If you have questions, reply to this email or contact eriks@ervitex.lv.",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function renderHtml(order: any, lang: Lang) {
  const tr = t(lang);
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">${tr.subject}</h2>
    <p style="margin:0 0 16px;">${tr.hi}${order.shipping_name ? `, ${order.shipping_name}` : ""}!</p>
    <p style="margin:0 0 12px;line-height:1.5;">${tr.intro}</p>
    <p style="margin:0 0 16px;"><strong>${tr.orderNo}</strong> #${String(order.order_number).padStart(5, "0")}</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#444;">${tr.refund}</p>
    <p style="margin:24px 0 8px;color:#555;">${tr.questions}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { order_id, lang } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const language: Lang = lang === "en" ? "en" : "lv";

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: order, error } = await service
      .from("orders")
      .select("id, order_number, guest_email, user_id, shipping_name, cancellation_email_sent_at")
      .eq("id", order_id)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.cancellation_email_sent_at) {
      return new Response(JSON.stringify({ skipped: true, reason: "already sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientEmail: string | null = order.guest_email;
    if (!recipientEmail && order.user_id) {
      const { data: u } = await service.auth.admin.getUserById(order.user_id);
      recipientEmail = u?.user?.email ?? null;
    }
    if (!recipientEmail) throw new Error("No recipient email");

    const html = renderHtml(order, language);
    const subject = `${t(language).subject} #${String(order.order_number).padStart(5, "0")}`;

    const messageId = makeMessageId("order-cancelled");
    await logEmailAttempt(service, {
      message_id: messageId,
      template_name: "order-cancelled",
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { order_id, order_number: order.order_number, lang: language },
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Resend error:", resp.status, text);
      await logEmailAttempt(service, {
        message_id: messageId,
        template_name: "order-cancelled",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: text,
        metadata: { order_id, http_status: resp.status },
      });
      return new Response(JSON.stringify({ error: "Failed to send email", detail: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await service
      .from("orders")
      .update({ cancellation_email_sent_at: new Date().toISOString() })
      .eq("id", order_id);

    await logEmailAttempt(service, {
      message_id: messageId,
      template_name: "order-cancelled",
      recipient_email: recipientEmail,
      status: "sent",
      metadata: { order_id, order_number: order.order_number, lang: language },
    });

    return new Response(JSON.stringify({ sent: true, to: recipientEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-order-cancelled error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});