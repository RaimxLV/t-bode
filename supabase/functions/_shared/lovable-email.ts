import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { logEmailAttempt, makeMessageId } from "./email-log.ts";

const SENDER_DOMAIN = "notify.t-bode.lv";
const DEFAULT_FROM = `T-Bode <noreply@${SENDER_DOMAIN}>`;

/**
 * Enqueues a transactional email to the Lovable Emails queue.
 * The process-email-queue dispatcher will pick it up and send via Lovable's
 * Email API. Returns the message_id used for tracking in email_send_log.
 *
 * NOTE: Lovable Emails does NOT support file attachments. For PDFs etc.,
 * upload to storage and include a signed URL in the HTML body.
 */
export async function sendLovableTransactional(
  service: SupabaseClient,
  params: {
    template: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  },
): Promise<{ ok: boolean; messageId: string; error?: string }> {
  const messageId = makeMessageId(params.template);
  const idempotencyKey = params.idempotencyKey || messageId;

  await logEmailAttempt(service, {
    message_id: messageId,
    template_name: params.template,
    recipient_email: params.to,
    status: "pending",
    metadata: params.metadata ?? {},
  });

  // Lovable Email API requires a plain-text body. Auto-generate from HTML
  // when caller did not supply one to prevent `missing_parameter: text` 400s.
  const textBody = params.text && params.text.trim().length > 0
    ? params.text
    : htmlToPlainText(params.html);

  // Lovable Email API requires an unsubscribe token for transactional sends
  // (otherwise it rejects with 400 missing_unsubscribe). Reuse existing token
  // for this recipient, or create one.
  const unsubscribeToken = await getOrCreateUnsubscribeToken(service, params.to);

  const payload = {
    to: params.to,
    from: params.from || DEFAULT_FROM,
    sender_domain: SENDER_DOMAIN,
    subject: params.subject,
    html: params.html,
    text: textBody,
    purpose: "transactional",
    label: params.template,
    idempotency_key: idempotencyKey,
    unsubscribe_token: unsubscribeToken,
    message_id: messageId,
    queued_at: new Date().toISOString(),
  };

  const { error } = await service.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload,
  });

  if (error) {
    console.error("enqueue_email failed:", error);
    await logEmailAttempt(service, {
      message_id: messageId,
      template_name: params.template,
      recipient_email: params.to,
      status: "failed",
      error_message: error.message,
      metadata: params.metadata ?? {},
    });
    return { ok: false, messageId, error: error.message };
  }

  return { ok: true, messageId };
}

function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}