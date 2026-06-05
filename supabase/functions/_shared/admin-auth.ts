import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * Verifies the request carries an admin Bearer JWT.
 * Returns { ok: true } on success or a ready-to-return Response on failure.
 */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
  service?: SupabaseClient,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const svc = service ?? createClient(SUPABASE_URL, SERVICE_KEY);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const deny = (status = 401, msg = "Unauthorized") =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!token) return { ok: false, response: deny() };
  if (token === SERVICE_KEY) return { ok: true, userId: "service" };

  const { data: userData, error } = await svc.auth.getUser(token);
  if (error || !userData?.user) return { ok: false, response: deny() };

  const uid = userData.user.id;
  const { data: roleRow } = await svc
    .from("user_roles").select("role")
    .eq("user_id", uid).eq("role", "admin").maybeSingle();
  let isAdmin = !!roleRow;
  if (!isAdmin && userData.user.email) {
    const { data: wl } = await svc.rpc("is_admin_whitelisted", { _email: userData.user.email });
    isAdmin = !!wl;
  }
  if (!isAdmin) return { ok: false, response: deny(403, "Forbidden") };
  return { ok: true, userId: uid };
}