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
    let downloadKind: string | null = null;
    let downloadIndex: number | null = null;
    let force = false;
    if (req.method === "GET") {
      const u = new URL(req.url);
      orderItemId = u.searchParams.get("order_item_id");
      zakekeOrderId = u.searchParams.get("zakeke_order_id");
      wantZip = u.searchParams.get("zip") === "1";
      downloadUrl = u.searchParams.get("download_url");
      downloadName = u.searchParams.get("download_name");
      downloadKind = u.searchParams.get("download_kind");
      const rawIndex = u.searchParams.get("download_index");
      downloadIndex = rawIndex != null && /^\d+$/.test(rawIndex) ? Number(rawIndex) : null;
      force = u.searchParams.get("force") === "1";
    } else {
      const body = await req.json().catch(() => ({}));
      orderItemId = body?.order_item_id ?? null;
      zakekeOrderId = body?.zakeke_order_id ?? null;
      wantZip = body?.zip === true || body?.zip === "1";
      downloadUrl = body?.download_url ?? null;
      downloadName = body?.download_name ?? null;
      downloadKind = body?.download_kind ?? null;
      downloadIndex = Number.isInteger(body?.download_index) ? Number(body.download_index) : null;
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

      const rowDesign = row.zakeke_design_id ? String(row.zakeke_design_id) : null;
      const belongsToRowDesign = (f: any) => {
        if (!rowDesign) return true;
        const fileDesign = f?.designId ?? f?.designID ?? f?.design_id ?? null;
        // Untagged files can only be trusted when they came from the exact
        // Zakeke order-item endpoint. Order-level files must be tagged before
        // we attach them to a specific row.
        return fileDesign ? String(fileDesign) === rowDesign : false;
      };
      const filterForRowDesign = (candidateFiles: any[]) => {
        if (!rowDesign) return candidateFiles;
        const tagged = candidateFiles.filter((f) => f?.designId ?? f?.designID ?? f?.design_id);
        if (tagged.length === 0) return candidateFiles;
        return tagged.filter(belongsToRowDesign);
      };

      // 1) Use cached files if Zakeke webhook already filled them in.
      if (!force && Array.isArray(row.zakeke_print_files) && row.zakeke_print_files.length > 0) {
        // Guard against a known historical bug where the webhook wrote the
        // same file array to multiple order_items. If every cached file
        // carries a designId that does NOT match this row's design, treat
        // the cache as stale and refetch.
        const cached = row.zakeke_print_files as any[];
        const cachedDesigns = cached
          .map((f) => (f?.designId ?? f?.designID ?? f?.design_id ? String(f?.designId ?? f?.designID ?? f?.design_id) : null))
          .filter((x): x is string => !!x);
        const cacheBelongsToThisRow =
          !rowDesign ||
          // If the cache is untagged but tied to a concrete order-item id, it
          // is safe. If it came from an order-level fetch, untagged/mismatched
          // cache is unsafe and must be refetched instead of re-serving duplicates.
          (cachedDesigns.length === 0 && !!row.zakeke_order_item_id) ||
          cachedDesigns.some((d) => d === rowDesign);
        if (cacheBelongsToThisRow) {
          files = cached as any;
        } else {
          console.warn(
            `zakeke-print-files: cache mismatch on order_item ${orderItemId} (row design ${rowDesign}, cached designs ${cachedDesigns.join(",")}) — refetching`,
          );
        }
      }
      // 2) Otherwise call Zakeke directly via the order-item id.
      if (files.length === 0 && row.zakeke_order_item_id) {
        files = await getZakekeOrderItemFiles(row.zakeke_order_item_id);
      }
      // 3) Resolve via order endpoint and filter by THIS row's designId.
      if (files.length === 0 && row.zakeke_order_id) {
        const all = await getZakekeOrderOutputFiles(row.zakeke_order_id);
        files = filterForRowDesign(all);
      }
      // 4) No usable Zakeke order-item files yet but we have a designId —
      // create a dedicated one-item Zakeke order on the fly. This is the
      // recovery path for historical rows where multiple designs shared the
      // same order-level id and every row cached the same file.
      if (files.length === 0 && row.zakeke_design_id && !row.zakeke_order_item_id) {
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
      }
      if (files.length === 0 && !row.zakeke_design_id && !row.zakeke_order_id && !row.zakeke_order_item_id) {
        return new Response(
          JSON.stringify({ error: "no Zakeke design on this order_item" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Persist freshly-fetched files so subsequent clicks are instant.
      if (files.length > 0) {
        files = filterForRowDesign(files);
        await service
          .from("order_items")
          .update({ zakeke_print_files: files })
          .eq("id", orderItemId);
      }
    } else if (zakekeOrderId) {
      files = await getZakekeOrderOutputFiles(zakekeOrderId);
    }

    if (downloadUrl) {
      const isRasterPrint = (f: any) => {
        const url = String(f?.url ?? f?.fileUrl ?? f?.downloadUrl ?? f?.link ?? "").toLowerCase();
        const name = String(f?.name ?? f?.fileName ?? "").toLowerCase();
        const side = String(f?.side ?? f?.type ?? f?.kind ?? "").toLowerCase();
        const text = `${url} ${name} ${side}`;
        const isRaster = /\.(png|jpe?g|webp)(\?|#|$)/.test(text) || /image\/(png|jpe?g|webp)/.test(text) || side === "png";
        const isZip = /\.zip(\?|#|$)/.test(text) || side === "production-zip" || side === "zip";
        const isPreview = /mockup|preview|thumbnail/.test(text);
        return isRaster && !isZip && !isPreview;
      };
      const downloadable = downloadKind === "print" ? files.filter(isRasterPrint) : files;
      const allowed = typeof downloadIndex === "number" && downloadable[downloadIndex]
        ? downloadable[downloadIndex]
        : downloadable.find((f: any) => String(f?.url ?? "") === downloadUrl);
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
