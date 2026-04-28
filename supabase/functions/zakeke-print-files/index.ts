import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getZakekeOrderPrintFilesUrl } from "../_shared/zakeke.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin-only endpoint. Given a zakeke_order_id, returns a one-time download
 * URL for the print-files ZIP archive.
 *
 * GET  /functions/v1/zakeke-print-files?zakeke_order_id=...   -> { url }
 * POST /functions/v1/zakeke-print-files { zakeke_order_id }   -> { url }
 *
 * Auth: requires a logged-in admin (validated against user_roles + whitelist).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: isAdmin, error: roleErr } = await service.rpc(
      "is_admin_whitelisted",
      { _email: userData.user.email ?? "" }
    );
    const { data: hasAdminRole } = await service.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || (!isAdmin && !hasAdminRole)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let zakekeOrderId: string | null = null;
    if (req.method === "GET") {
      zakekeOrderId = new URL(req.url).searchParams.get("zakeke_order_id");
    } else {
      const body = await req.json().catch(() => ({}));
      zakekeOrderId = body?.zakeke_order_id ?? null;
    }

    if (!zakekeOrderId || typeof zakekeOrderId !== "string") {
      return new Response(
        JSON.stringify({ error: "zakeke_order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = await getZakekeOrderPrintFilesUrl(zakekeOrderId);
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("zakeke-print-files error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});