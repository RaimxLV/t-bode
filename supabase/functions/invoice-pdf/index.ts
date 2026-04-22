// Serves an invoice PDF to admins and to the order owner.
// Usage: GET /invoice-pdf?invoice_id=<uuid>  OR  ?order_id=<uuid>&current=1
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");
    const orderId = url.searchParams.get("order_id");
    if (!invoiceId && !orderId) {
      return new Response(JSON.stringify({ error: "invoice_id or order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const token = authHeader.replace("Bearer ", "");

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await service.auth.getUser(token);
    if (!userData?.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    let inv: any;
    if (invoiceId) {
      const { data } = await service.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
      inv = data;
    } else {
      const { data } = await service
        .from("invoices").select("*")
        .eq("order_id", orderId!).eq("is_current", true).maybeSingle();
      inv = data;
    }
    if (!inv) return new Response("Not found", { status: 404, headers: corsHeaders });

    // Authorization: admin OR order owner
    const { data: roleRow } = await service.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    let allowed = !!roleRow;
    if (!allowed && userData.user.email) {
      const { data: wl } = await service.rpc("is_admin_whitelisted", { _email: userData.user.email });
      allowed = !!wl;
    }
    if (!allowed) {
      const { data: ord } = await service.from("orders").select("user_id").eq("id", inv.order_id).maybeSingle();
      allowed = ord?.user_id === userData.user.id;
    }
    if (!allowed) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    // Mark viewed_at (first time only)
    if (!inv.viewed_at) {
      await service.from("invoices").update({ viewed_at: new Date().toISOString() }).eq("id", inv.id);
    }

    const { data: blob, error } = await service.storage.from("invoices").download(inv.pdf_path);
    if (error || !blob) throw new Error(`Storage error: ${error?.message}`);
    const buf = new Uint8Array(await blob.arrayBuffer());

    return new Response(buf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${inv.invoice_number}_v${inv.version}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("invoice-pdf error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});