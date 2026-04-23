import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// POSTs { order_ids: string[] } and returns a ZIP containing the current invoice PDF
// for each selected order. Admin-only. Auto-generates an invoice when missing.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_ids } = await req.json();
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: "order_ids array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order_ids.length > 100) {
      return new Response(JSON.stringify({ error: "Maximum 100 invoices per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    let allowed = !!roleRow;
    if (!allowed && userData.user.email) {
      const { data: wl } = await supabase.rpc("is_admin_whitelisted", { _email: userData.user.email });
      allowed = !!wl;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zip = new JSZip();
    const failures: Array<{ order_id: string; reason: string }> = [];
    let included = 0;

    for (const orderId of order_ids) {
      try {
        // Find current invoice; auto-generate if missing
        let { data: inv } = await supabase
          .from("invoices")
          .select("id, invoice_number, pdf_path")
          .eq("order_id", orderId)
          .eq("is_current", true)
          .maybeSingle();

        if (!inv) {
          await supabase.functions.invoke("generate-invoice", { body: { order_id: orderId } });
          const retry = await supabase
            .from("invoices")
            .select("id, invoice_number, pdf_path")
            .eq("order_id", orderId)
            .eq("is_current", true)
            .maybeSingle();
          inv = retry.data ?? null;
        }

        if (!inv) {
          failures.push({ order_id: orderId, reason: "Invoice not found and could not be generated" });
          continue;
        }

        const { data: file, error: dlErr } = await supabase.storage
          .from("invoices")
          .download(inv.pdf_path);
        if (dlErr || !file) {
          failures.push({ order_id: orderId, reason: dlErr?.message ?? "Download failed" });
          continue;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        zip.file(`${inv.invoice_number}.pdf`, bytes);
        included += 1;
      } catch (e: any) {
        failures.push({ order_id: orderId, reason: e?.message ?? String(e) });
      }
    }

    if (included === 0) {
      return new Response(JSON.stringify({ error: "No invoices could be retrieved", failures }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const filename = `invoices-${new Date().toISOString().slice(0, 10)}.zip`;

    return new Response(zipBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Invoices-Included": String(included),
        "X-Invoices-Failed": String(failures.length),
      },
    });
  } catch (err: any) {
    console.error("invoices-bulk-download error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});