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

  const payload = {
    to: params.to,
    from: params.from || DEFAULT_FROM,
    sender_domain: SENDER_DOMAIN,
    subject: params.subject,
    html: params.html,
    text: params.text,
    purpose: "transactional",
    label: params.template,
    idempotency_key: idempotencyKey,
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