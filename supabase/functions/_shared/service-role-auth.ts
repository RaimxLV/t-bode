/**
 * Internal-call guard for edge functions invoked exclusively server-to-server
 * (webhooks, cron jobs, other edge functions, admin UI through supabase.functions.invoke
 * with the service-role key). Rejects any request that does not carry the
 * service-role bearer token, preventing unauthenticated abuse from the public
 * internet.
 */
export function requireServiceRole(
  req: Request,
  corsHeaders: Record<string, string>,
): { ok: true } | { ok: false; response: Response } {
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!SERVICE_KEY || token !== SERVICE_KEY) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true };
}