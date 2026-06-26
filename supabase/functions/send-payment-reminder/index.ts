import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendLovableTransactional } from "../_shared/lovable-email.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Atgādinājums par apmaksu" : "Payment reminder",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? "Atgādinām, ka Tavs pasūtījums vēl gaida apmaksu ar bankas pārskaitījumu."
      : "This is a reminder that your order is still awaiting bank transfer payment.",
  orderNo: lang === "lv" ? "Pasūtījuma Nr." : "Order No.",
  total: lang === "lv" ? "Summa" : "Amount",
  details: lang === "lv" ? "Bankas rekvizīti" : "Bank details",
  beneficiary: lang === "lv" ? "Saņēmējs" : "Beneficiary",
  iban: "IBAN",
  swift: "SWIFT",
  reference: lang === "lv" ? "Maksājuma mērķis" : "Payment reference",
  expiresNote:
    lang === "lv"
      ? "Ja apmaksa netiks saņemta tuvākajā laikā, pasūtījums tiks automātiski atcelts."
      : "If payment is not received soon, the order will be cancelled automatically.",
  questions:
    lang === "lv"
      ? "Ja apmaksa jau veikta, ignorē šo e-pastu."
      : "If you have already paid, please ignore this email.",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function renderHtml(order: any, settings: any, lang: Lang) {
  const tr = t(lang);
  const ref = `#${String(order.order_number).padStart(5, "0")}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;color:#DC2626;">${tr.subject}</h2>
    <p style="margin:0 0 16px;">${tr.hi}${order.shipping_name ? `, ${order.shipping_name}` : ""}!</p>
    <p style="margin:0 0 12px;line-height:1.5;">${tr.intro}</p>
    <p style="margin:0 0 4px;"><strong>${tr.orderNo}</strong> ${ref}</p>
    <p style="margin:0 0 16px;"><strong>${tr.total}:</strong> €${Number(order.total).toFixed(2)}</p>

    <div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">${tr.details}</p>
      <p style="margin:0 0 4px;"><strong>${tr.beneficiary}:</strong> ${settings.bank_beneficiary}</p>
      <p style="margin:0 0 4px;"><strong>${tr.iban}:</strong> ${settings.bank_iban}</p>
      <p style="margin:0 0 4px;"><strong>${tr.swift}:</strong> ${settings.bank_swift}</p>
      <p style="margin:0;"><strong>${tr.reference}:</strong> ${ref}</p>
    </div>

    <p style="margin:16px 0 8px;color:#444;line-height:1.5;">${tr.expiresNote}</p>
    <p style="margin:16px 0 8px;color:#555;">${tr.questions}</p>
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
        .select("id, order_number, total, guest_email, user_id, shipping_name, status, payment_method, payment_reminder_count")
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

      const html = renderHtml(order, settings, language);
      const subject = `${t(language).subject} #${String(order.order_number).padStart(5, "0")}`;

      const reminderCount = (order as any).payment_reminder_count != null
        ? Number((order as any).payment_reminder_count)
        : 0;
      const result = await sendLovableTransactional(service, {
        template: "payment-reminder",
        to: toEmail,
        subject,
        html,
        idempotencyKey: `payment-reminder-${orderId}-${reminderCount}`,
        metadata: { order_id: orderId, order_number: order.order_number, lang: language },
      });
      if (!result.ok) {
        return { sent: false, error: result.error };
      }
      const newCount = (order as any).payment_reminder_count != null
        ? Number((order as any).payment_reminder_count) + 1
        : 1;
      await service
        .from("orders")
        .update({
          last_payment_reminder_at: new Date().toISOString(),
          payment_reminder_count: newCount,
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

    // Escalation cron: 24h → 3d → 7d (then auto-cancel)
    const now = Date.now();
    const { data: pendingOrders } = await service
      .from("orders")
      .select("id, created_at, payment_reminder_count, last_payment_reminder_at")
      .eq("payment_method", "bank_transfer")
      .eq("status", "pending");

    let sent = 0;
    let cancelled = 0;
    let skipped = 0;

    for (const o of pendingOrders ?? []) {
      const count = Number((o as any).payment_reminder_count ?? 0);
      const ageMs = now - new Date(o.created_at).getTime();
      const lastSentMs = o.last_payment_reminder_at
        ? now - new Date(o.last_payment_reminder_at).getTime()
        : Infinity;
      if (lastSentMs < 12 * 60 * 60 * 1000) { skipped++; continue; }

      if (count === 0 && ageMs >= 24 * 60 * 60 * 1000) {
        const r = await sendOne(o.id, "lv");
        if ((r as any).sent) sent++; else skipped++;
      } else if (count === 1 && ageMs >= 3 * 24 * 60 * 60 * 1000) {
        const r = await sendOne(o.id, "lv");
        if ((r as any).sent) sent++; else skipped++;
      } else if (count >= 2 && ageMs >= 7 * 24 * 60 * 60 * 1000) {
        if (count === 2) {
          const r = await sendOne(o.id, "lv");
          if ((r as any).sent) sent++;
        }
        await service.from("orders").update({
          status: "cancelled" as any,
          notes: `[AUTO-CANCEL] Bank transfer not received within 7 days (${new Date().toISOString().slice(0, 10)})`,
        }).eq("id", o.id);
        cancelled++;
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