import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  createZakekeOrder,
  getZakekeDesignZipFile,
  getZakekeOrderItemFiles,
  getZakekeOrderOutputFiles,
} from "../_shared/zakeke.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

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
    let wantZip = false;
    let downloadUrl: string | null = null;
    let downloadName: string | null = null;
    let force = false;
    if (req.method === "GET") {
      const u = new URL(req.url);
      orderItemId = u.searchParams.get("order_item_id");
      zakekeOrderId = u.searchParams.get("zakeke_order_id");
      wantZip = u.searchParams.get("zip") === "1";
      downloadUrl = u.searchParams.get("download_url");
      downloadName = u.searchParams.get("download_name");
      force = u.searchParams.get("force") === "1";
    } else {
      const body = await req.json().catch(() => ({}));
      orderItemId = body?.order_item_id ?? null;
      zakekeOrderId = body?.zakeke_order_id ?? null;
      wantZip = body?.zip === true || body?.zip === "1";
      downloadUrl = body?.download_url ?? null;
      downloadName = body?.download_name ?? null;
      force = body?.force === true || body?.force === "1";
    }

    if (!orderItemId && !zakekeOrderId) {
      return new Response(
        JSON.stringify({ error: "order_item_id or zakeke_order_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let files: Awaited<ReturnType<typeof getZakekeOrderItemFiles>> = [];
    let zipFilename = "print-files.zip";

    if (orderItemId) {
      // Look up the row to find the cached files OR Zakeke ids.
      const { data: row, error: rowErr } = await service
        .from("order_items")
        .select(
          "id, order_id, quantity, zakeke_design_id, zakeke_order_id, zakeke_order_item_id, zakeke_print_files, zakeke_visitor_code, product_name"
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
      zipFilename = `print-files-${(row.product_name || "item").replace(/[^a-z0-9]+/gi, "-")}-${orderItemId.slice(0, 8)}.zip`;

      // 1) Use cached files if Zakeke webhook already filled them in.
      if (!force && Array.isArray(row.zakeke_print_files) && row.zakeke_print_files.length > 0) {
        files = row.zakeke_print_files as any;
      }
      // 2) Otherwise call Zakeke directly via the order-item id.
      else if (row.zakeke_order_item_id) {
        files = await getZakekeOrderItemFiles(row.zakeke_order_item_id);
      }
      // 3) Last resort: resolve via legacy order endpoint.
      else if (row.zakeke_order_id) {
        files = await getZakekeOrderOutputFiles(row.zakeke_order_id);
      }
      // 4) No Zakeke order yet but we have a designId — create one on the fly.
      else if (row.zakeke_design_id) {
        try {
          const { zakekeOrderId: newOrderId, orderItemIds } = await createZakekeOrder({
            externalOrderId: `${row.order_id}:${row.id}`,
            customerCode: String(row.order_id),
            visitorCode: row.zakeke_visitor_code ?? null,
            items: [
              {
                designId: String(row.zakeke_design_id),
                quantity: row.quantity ?? 1,
                reference: row.id,
              },
            ],
          });
          await service
            .from("order_items")
            .update({
              zakeke_order_id: newOrderId,
              zakeke_order_item_id: orderItemIds[0] ?? null,
            })
            .eq("id", orderItemId);
          if (orderItemIds[0]) {
            files = await getZakekeOrderItemFiles(orderItemIds[0]);
          } else {
            files = await getZakekeOrderOutputFiles(newOrderId);
          }
        } catch (orderErr) {
          console.error("zakeke-print-files order creation fallback to design zip:", orderErr);
          const designZip = await getZakekeDesignZipFile(String(row.zakeke_design_id));
          files = designZip ? [designZip] : [];
        }
      } else {
        return new Response(
          JSON.stringify({ error: "no Zakeke design on this order_item" }),
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

    if (downloadUrl) {
      const allowed = files.find((f: any) => String(f?.url ?? "") === downloadUrl);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "requested file not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const remote = await fetch(downloadUrl);
      if (!remote.ok) {
        return new Response(JSON.stringify({ error: `download failed: HTTP ${remote.status}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentType = remote.headers.get("content-type") || "application/octet-stream";
      const fallbackName = String(allowed?.name || "print-file").replace(/[^a-z0-9._-]+/gi, "-");
      const safeName = String(downloadName || fallbackName).replace(/["\r\n]+/g, "").trim() || fallbackName;
      return new Response(remote.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${safeName}"`,
        },
      });
    }

    if (wantZip) {
      if (!files.length) {
        return new Response(
          JSON.stringify({ error: "Zakeke vēl nav sagatavojusi drukas failus. Mēģini vēlreiz pēc dažām minūtēm." }),
          { status: 425, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const zip = new JSZip();
      const used = new Set<string>();
      await Promise.all(files.map(async (f, idx) => {
        try {
          const r = await fetch(f.url);
          if (!r.ok) {
            zip.file(`_failed_${idx}.txt`, `Failed to download ${f.url}: ${r.status}`);
            return;
          }
          const buf = new Uint8Array(await r.arrayBuffer());
          let name = f.name || `file-${idx}`;
          // Add extension from URL if missing
          if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
            const m = f.url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
            if (m) name += `.${m[1]}`;
          }
          // Prefix with side if available
          if (f.side && !name.toLowerCase().includes(String(f.side).toLowerCase())) {
            name = `${f.side}_${name}`;
          }
          // Dedup
          let final = name;
          let n = 1;
          while (used.has(final)) {
            const dot = name.lastIndexOf(".");
            final = dot > 0 ? `${name.slice(0, dot)}_${n}${name.slice(dot)}` : `${name}_${n}`;
            n++;
          }
          used.add(final);
          zip.file(final, buf);
        } catch (e) {
          zip.file(`_failed_${idx}.txt`, `Error: ${(e as Error).message}`);
        }
      }));
      const zipBuf = await zip.generateAsync({ type: "uint8array" });
      return new Response(zipBuf, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipFilename}"`,
        },
      });
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
