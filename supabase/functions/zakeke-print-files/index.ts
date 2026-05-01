import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  getZakekeOrderItemFiles,
  getZakekeOrderOutputFiles,
} from "../_shared/zakeke.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin-only endpoint. Returns the high-resolution PRODUCTION files for
 * a single order_item from Zakeke (the print-ready PDFs/PNGs, customer's
 * original uploads, mockups, and work-order PDF).
 *
 * Body / query (any one is sufficient):
 *   - order_item_id: our internal order_items.id (preferred)
 *   - zakeke_order_id: legacy fallback
 *
 * Response: { files: Array<{ name, url, side?, designId? }>, url?: string }
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

    let orderItemId: string | null = null;
    let zakekeOrderId: string | null = null;
    if (req.method === "GET") {
      const u = new URL(req.url);
      orderItemId = u.searchParams.get("order_item_id");
      zakekeOrderId = u.searchParams.get("zakeke_order_id");
    } else {
      const body = await req.json().catch(() => ({}));
      orderItemId = body?.order_item_id ?? null;
      zakekeOrderId = body?.zakeke_order_id ?? null;
    }

    if (!orderItemId && !zakekeOrderId) {
      return new Response(
        JSON.stringify({ error: "order_item_id or zakeke_order_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let files: Awaited<ReturnType<typeof getZakekeOrderItemFiles>> = [];

    if (orderItemId) {
      // Look up the row to find the cached files OR Zakeke ids.
      const { data: row, error: rowErr } = await service
        .from("order_items")
        .select(
          "id, zakeke_order_id, zakeke_order_item_id, zakeke_print_files"
        )
        .eq("id", orderItemId)
        .maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) {
        return new Response(
          JSON.stringify({ error: "order_item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1) Use cached files if Zakeke webhook already filled them in.
      if (Array.isArray(row.zakeke_print_files) && row.zakeke_print_files.length > 0) {
        files = row.zakeke_print_files as any;
      }
      // 2) Otherwise call Zakeke directly via the order-item id.
      else if (row.zakeke_order_item_id) {
        files = await getZakekeOrderItemFiles(row.zakeke_order_item_id);
      }
      // 3) Last resort: resolve via legacy order endpoint.
      else if (row.zakeke_order_id) {
        files = await getZakekeOrderOutputFiles(row.zakeke_order_id);
      } else {
        return new Response(
          JSON.stringify({ error: "no Zakeke ids on this order_item" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Persist freshly-fetched files so subsequent clicks are instant.
      if (files.length > 0) {
        await service
          .from("order_items")
          .update({ zakeke_print_files: files })
          .eq("id", orderItemId);
      }
    } else if (zakekeOrderId) {
      files = await getZakekeOrderOutputFiles(zakekeOrderId);
    }

    return new Response(
      JSON.stringify({ files, url: files[0]?.url ?? null }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("zakeke-print-files error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
