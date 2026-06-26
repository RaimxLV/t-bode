import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Pasūtījums atcelts" : "Order cancelled",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? "Pamanījām, ka Tavs pasūtījums tika atcelts, jo maksājums netika pabeigts. Ja tas notika netīšām, mēs labprāt palīdzēsim to atrisināt."
      : "We noticed your order was cancelled because the payment wasn't completed. If that wasn't intentional, we'd be glad to help you finish it.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  refund:
    lang === "lv"
      ? "Ja maksājums jau bija veikts, atmaksa tiks veikta uz to pašu kontu 5–10 darba dienu laikā."
      : "If a payment was made, a refund will be issued to the same account within 5–10 business days.",
  helpHeading:
    lang === "lv"
      ? "Vai varam palīdzēt?"
      : "Can we help?",
  helpBody:
    lang === "lv"
      ? "Lai mēs varētu uzlabot pieredzi un, ja vēlies, pabeigt pasūtījumu, lūdzu, atbildi uz šo e-pastu vienā teikumā — kas bija iemesls? Daži biežākie:"
      : "To help us improve and, if you'd like, complete your order, please reply to this email in one sentence — what was the reason? A few common ones:",
  reasons:
    lang === "lv"
      ? [
          "Maksājums neizdevās vai bankas aplikācija sastinga",
          "Pārdomāju izmēru, krāsu vai dizainu",
          "Cena ar piegādi izrādījās augstāka nekā gaidīts",
          "Vienkārši nepaspēju pabeigt 30 minūtēs",
        ]
      : [
          "Payment failed or the bank app got stuck",
          "Changed my mind about size, colour or design",
          "Total with shipping was higher than expected",
          "Simply ran out of time within 30 minutes",
        ],
  ctaText:
    lang === "lv"
      ? "Rakstīt mums"
      : "Contact us",
  questions:
    lang === "lv"
      ? `Atbildi vienkārši uz šo e-pastu vai raksti uz <a href="mailto:info@t-bode.lv" style="color:#DC2626;white-space:nowrap;">info@t‑bode.lv</a> — atbildam tās pašas darba dienas laikā.`
      : `Just reply to this email or write to <a href="mailto:info@t-bode.lv" style="color:#DC2626;white-space:nowrap;">info@t‑bode.lv</a> — we respond the same business day.`,
  team: lang === "lv" ? "T‑Bode komanda" : "T‑Bode team",
});

function renderHtml(order: any, lang: Lang) {
  const tr = t(lang);
  const mailtoSubject = encodeURIComponent(
    (lang === "lv" ? "Pasūtījums #" : "Order #") +
      String(order.order_number).padStart(5, "0"),
  );
  const mailtoBody = encodeURIComponent(
    lang === "lv"
      ? "Sveiki! Mans pasūtījums tika atcelts. Iemesls bija: "
      : "Hi! My order was cancelled. The reason was: ",
  );
  const mailto = `mailto:info@t-bode.lv?subject=${mailtoSubject}&body=${mailtoBody}`;
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
    <div style="margin:24px 0;padding:16px 18px;background:#FFF5F5;border-left:3px solid #DC2626;border-radius:4px;">
      <p style="margin:0 0 8px;font-weight:bold;color:#DC2626;">${tr.helpHeading}</p>
      <p style="margin:0 0 10px;line-height:1.5;color:#333;">${tr.helpBody}</p>
      <ul style="margin:0 0 14px 18px;padding:0;color:#444;line-height:1.6;">
        ${tr.reasons.map((r) => `<li>${r}</li>`).join("")}
      </ul>
      <a href="${mailto}" style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">${tr.ctaText}</a>
    </div>
    <p style="margin:24px 0 8px;color:#555;">${tr.questions}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

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

    const result = await sendLovableTransactional(service, {
      template: "order-cancelled",
      to: recipientEmail,
      subject,
      html,
      idempotencyKey: `order-cancelled-${order_id}`,
      metadata: { order_id, order_number: order.order_number, lang: language },
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: "Failed to enqueue email", detail: result.error }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await service
      .from("orders")
      .update({ cancellation_email_sent_at: new Date().toISOString() })
      .eq("id", order_id);

    return new Response(JSON.stringify({ queued: true, to: recipientEmail }), {
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