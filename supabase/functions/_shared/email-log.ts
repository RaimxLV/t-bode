import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * Logs an email send attempt to email_send_log.
 * Two rows per email: one "pending" before send, one "sent" or "failed" after.
 * Both share the same message_id for deduplication in dashboards.
 */
export async function logEmailAttempt(
  service: SupabaseClient,
  params: {
    message_id: string;
    template_name: string;
    recipient_email: string;
    status: "pending" | "sent" | "failed" | "dlq" | "suppressed";
    error_message?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await service.from("email_send_log").insert({
      message_id: params.message_id,
      template_name: params.template_name,
      recipient_email: params.recipient_email,
      status: params.status,
      error_message: params.error_message ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.error("email_send_log insert failed:", (e as Error).message);
  }
}

export function makeMessageId(template: string): string {
  return `${template}-${crypto.randomUUID()}`;
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}