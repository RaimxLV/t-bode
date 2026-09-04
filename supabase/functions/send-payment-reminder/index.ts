import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";
import {
  addBusinessDays,
  businessDaysSince,
  formatDateLv,
  PAYMENT_TERM_BUSINESS_DAYS,
} from "../_shared/business-days.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type Lang = "lv" | "en";

/**
 * Reminder stages for bank-transfer orders, inside the 5-business-day term:
 *   stage 1 → after 2 business days (friendly nudge)
 *   stage 2 → after 4 business days (last, still warm, reminder)
 *   then    → automatic cancellation after 5 business days
 */
const REMINDER_STAGES = [2, 4];

const t = (lang: Lang, stage: 1 | 2, dueLabel: string) => ({
  subject:
    lang === "lv"
      ? stage === 1
        ? "Draudzīgs atgādinājums par rēķinu"
        : "Pēdējais atgādinājums par rēķinu"
      : stage === 1
        ? "A friendly payment reminder"
        : "A final payment reminder",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? stage === 1
        ? "Ceram, ka Tev viss labi! Gribējām draudzīgi atgādināt, ka Tavs pasūtījums vēl gaida apmaksu ar bankas pārskaitījumu. Ja tas vienkārši aizmirsies — nekas nav zudis, pasūtījums ir droši rezervēts."
        : "Vēlamies pieklājīgi atgādināt, ka Tavam pasūtījumam vēl nav saņemta apmaksa. Šis ir pēdējais atgādinājums pirms pasūtījuma automātiskas atcelšanas — ļoti ceram, ka to nevajadzēs."
      : stage === 1
        ? "We hope you're doing well! Just a friendly reminder that your order is still awaiting your bank transfer. Your order is safely reserved for you."
        : "A polite reminder that we haven't received your payment yet. This is the last reminder before the order is cancelled automatically — we hope it won't come to that.",
  dueLine:
    lang === "lv"
      ? `Apmaksas termiņš: <strong>${dueLabel}</strong> (5 darba dienas no pasūtījuma).`
      : `Payment due: <strong>${dueLabel}</strong> (5 business days from the order date).`,
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  total: lang === "lv" ? "Summa" : "Amount",
  details: lang === "lv" ? "Bankas rekvizīti" : "Bank details",
  beneficiary: lang === "lv" ? "Saņēmējs" : "Beneficiary",
  iban: "IBAN",
  swift: "SWIFT",
  reference: lang === "lv" ? "Maksājuma mērķis" : "Payment reference",
  refHint:
    lang === "lv"
      ? "Lūdzu, maksājuma mērķī norādi tieši šo pasūtījuma numuru — tad varam apmaksu atzīmēt uzreiz."
      : "Please use exactly this order number as the payment reference so we can match it right away.",
  help:
    lang === "lv"
      ? "Ja radušies jautājumi, vēlies mainīt pasūtījumu vai nepieciešams ilgāks termiņš — vienkārši atbildi uz šo e-pastu, mēs labprāt palīdzēsim."
      : "If you have any questions, want to change the order, or need a bit more time — just reply to this email and we'll gladly help.",
  alreadyPaid:
    lang === "lv"
      ? "Ja apmaksa jau ir veikta, paldies — šo e-pastu vari droši ignorēt."
      : "If you have already paid, thank you — please ignore this email.",
  thanks: lang === "lv" ? "Paldies, ka izvēlējies T-Bode!" : "Thank you for choosing T-Bode!",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function renderHtml(order: any, settings: any, lang: Lang, stage: 1 | 2, dueLabel: string) {
  const tr = t(lang, stage, dueLabel);
  const ref = `#${String(order.order_number).padStart(5, "0")}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">${tr.subject}</h2>
    <p style="margin:0 0 16px;">${tr.hi}${order.shipping_name ? `, ${order.shipping_name}` : ""}!</p>
    <p style="margin:0 0 12px;line-height:1.6;">${tr.intro}</p>
    <p style="margin:0 0 16px;line-height:1.6;">${tr.dueLine}</p>
    <p style="margin:0 0 4px;"><strong>${tr.orderNo}</strong> ${ref}</p>
    <p style="margin:0 0 16px;"><strong>${tr.total}:</strong> €${Number(order.total).toFixed(2)}</p>

    <div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">${tr.details}</p>
      <p style="margin:0 0 4px;"><strong>${tr.beneficiary}:</strong> ${settings.bank_beneficiary}</p>
      <p style="margin:0 0 4px;"><strong>${tr.iban}:</strong> ${settings.bank_iban}</p>
      <p style="margin:0 0 4px;"><strong>${tr.swift}:</strong> ${settings.bank_swift}</p>
      <p style="margin:0;"><strong>${tr.reference}:</strong> ${ref}</p>
    </div>

    <p style="margin:12px 0 8px;color:#444;line-height:1.6;">${tr.refHint}</p>
    <p style="margin:12px 0 8px;color:#444;line-height:1.6;">${tr.help}</p>
    <p style="margin:12px 0 8px;color:#666;line-height:1.6;">${tr.alreadyPaid}</p>
    <p style="margin:20px 0 4px;color:#111;">${tr.thanks}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { order_id, lang } = body as { order_id?: string; lang?: string };

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: settings } = await service
      .from("site_settings")
      .select("bank_beneficiary, bank_iban, bank_swift")
      .limit(1)
      .maybeSingle();
    if (!settings) throw new Error("Bank settings not configured");

    // Single order mode (manual trigger from admin or specific id)
    const sendOne = async (orderId: string, language: Lang) => {
      const { data: order } = await service
        .from("orders")
        .select("id, order_number, total, guest_email, user_id, shipping_name, status, payment_method, payment_reminder_count, created_at")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return { skipped: true, reason: "not found" };
      if (order.payment_method !== "bank_transfer") return { skipped: true, reason: "not bank transfer" };
      if (order.status !== "pending") return { skipped: true, reason: "not pending" };

      let recipientEmail: string | null = order.guest_email;
      if (!recipientEmail && order.user_id) {
        const { data: u } = await service.auth.admin.getUserById(order.user_id);
        recipientEmail = u?.user?.email ?? null;
      }
      if (!recipientEmail) return { skipped: true, reason: "no email" };

      const toEmail = recipientEmail;

      const reminderCount = (order as any).payment_reminder_count != null
        ? Number((order as any).payment_reminder_count)
        : 0;
      const stage: 1 | 2 = reminderCount >= 1 ? 2 : 1;
      const dueLabel = formatDateLv(
        addBusinessDays(order.created_at, PAYMENT_TERM_BUSINESS_DAYS),
      );

      const html = renderHtml(order, settings, language, stage, dueLabel);
      const subject = `${t(language, stage, dueLabel).subject} #${String(order.order_number).padStart(5, "0")}`;

      const result = await sendLovableTransactional(service, {
        template: "payment-reminder",
        to: toEmail,
        subject,
        html,
        idempotencyKey: `payment-reminder-${orderId}-${reminderCount}`,
        metadata: { order_id: orderId, order_number: order.order_number, lang: language, stage },
      });
      if (!result.ok) {
        return { sent: false, error: result.error };
      }
      await service
        .from("orders")
        .update({
          last_payment_reminder_at: new Date().toISOString(),
          payment_reminder_count: reminderCount + 1,
        } as any)
        .eq("id", orderId);
      return { sent: true, to: toEmail };
    };

    if (order_id) {
      const result = await sendOne(order_id, lang === "en" ? "en" : "lv");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Escalation cron: 2 business days → 4 business days → cancel after 5
    const { data: pendingOrders } = await service
      .from("orders")
      .select("id, created_at, payment_reminder_count, last_payment_reminder_at")
      .eq("payment_method", "bank_transfer")
      .eq("status", "pending");

    let sent = 0;
    let cancelled = 0;
    let skipped = 0;
    const now = Date.now();

    for (const o of pendingOrders ?? []) {
      const count = Number((o as any).payment_reminder_count ?? 0);
      const bizDays = businessDaysSince(o.created_at);
      const lastSentMs = o.last_payment_reminder_at
        ? now - new Date(o.last_payment_reminder_at).getTime()
        : Infinity;

      // Term is over → cancel (send the 2nd reminder first if it never went out)
      if (bizDays >= PAYMENT_TERM_BUSINESS_DAYS) {
        if (count < REMINDER_STAGES.length && lastSentMs >= 12 * 60 * 60 * 1000) {
          const r = await sendOne(o.id, "lv");
          if ((r as any).sent) sent++;
        }
        await service.from("orders").update({
          status: "cancelled" as any,
          notes: `[AUTO-CANCEL] Bankas pārskaitījums nav saņemts 5 darba dienās (${new Date().toISOString().slice(0, 10)})`,
        }).eq("id", o.id);
        cancelled++;
        continue;
      }

      if (lastSentMs < 12 * 60 * 60 * 1000) { skipped++; continue; }

      const nextStageDay = REMINDER_STAGES[count];
      if (nextStageDay !== undefined && bizDays >= nextStageDay) {
        const r = await sendOne(o.id, "lv");
        if ((r as any).sent) sent++; else skipped++;
      } else {
        skipped++;
      }
    }
    return new Response(JSON.stringify({ sent, cancelled, skipped, total: pendingOrders?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-payment-reminder error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
