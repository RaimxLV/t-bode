import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { logEmailAttempt, makeMessageId } from "../_shared/email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "T-Bode <onboarding@resend.dev>";
const TEST_OVERRIDE_EMAIL = "ofsetadruka@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

type Lang = "lv" | "en";

const t = (lang: Lang) => ({
  subject: lang === "lv" ? "Paldies par ziņu!" : "Thanks for your message!",
  hi: lang === "lv" ? "Sveiki" : "Hi",
  intro:
    lang === "lv"
      ? "Paldies, ka sazinājies ar T-Bode! Esam saņēmuši Tavu ziņu un atbildēsim 1–2 darba dienu laikā."
      : "Thanks for contacting T-Bode! We've received your message and will reply within 1–2 business days.",
  yourMsg: lang === "lv" ? "Tava ziņa:" : "Your message:",
  questions:
    lang === "lv"
      ? "Steidzami jautājumi? Zvani +371 2X XXX XXX."
      : "Urgent questions? Call +371 2X XXX XXX.",
  team: lang === "lv" ? "T-Bode komanda" : "T-Bode team",
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderHtml(submission: any, lang: Lang) {
  const tr = t(lang);
  const msg = submission.message ? escapeHtml(submission.message).replace(/\n/g, "<br>") : "";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin:0 0 24px;">
      <img src="https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="T-Bode" style="height:60px;display:inline-block;" />
    </div>
    <h2 style="font-size:18px;margin:0 0 8px;">${tr.subject}</h2>
    <p style="margin:0 0 16px;">${tr.hi}${submission.name ? `, ${escapeHtml(submission.name)}` : ""}!</p>
    <p style="margin:0 0 20px;line-height:1.5;">${tr.intro}</p>

    ${msg ? `<div style="background:#f7f7f7;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;font-size:14px;color:#444;">
      <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#555;font-size:12px;">${tr.yourMsg}</p>
      <p style="margin:0;line-height:1.5;">${msg}</p>
    </div>` : ""}

    <p style="margin:24px 0 8px;color:#555;">${tr.questions}</p>
    <p style="margin:0;color:#555;">— ${tr.team}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { submission_id, lang } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "Missing submission_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const language: Lang = lang === "en" ? "en" : "lv";

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: submission, error } = await service
      .from("contact_submissions")
      .select("id, name, email, message")
      .eq("id", submission_id)
      .maybeSingle();
    if (error || !submission) throw new Error("Submission not found");
    if (!submission.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no email provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const originalRecipient = submission.email;
    const toEmail = TEST_OVERRIDE_EMAIL;

    const html = renderHtml(submission, language);
    const subject = t(language).subject;

    const messageId = makeMessageId("contact-reply");
    await logEmailAttempt(service, {
      message_id: messageId,
      template_name: "contact-reply",
      recipient_email: originalRecipient,
      status: "pending",
      metadata: { submission_id, lang: language, test_to: toEmail },
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: `[TEST → ${originalRecipient}] ${subject}`,
        html,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Resend error:", resp.status, text);
      await logEmailAttempt(service, {
        message_id: messageId,
        template_name: "contact-reply",
        recipient_email: originalRecipient,
        status: "failed",
        error_message: text,
        metadata: { submission_id, http_status: resp.status },
      });
      return new Response(JSON.stringify({ error: "Failed to send email", detail: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logEmailAttempt(service, {
      message_id: messageId,
      template_name: "contact-reply",
      recipient_email: originalRecipient,
      status: "sent",
      metadata: { submission_id, lang: language },
    });

    return new Response(JSON.stringify({ sent: true, to: toEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-contact-reply error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});