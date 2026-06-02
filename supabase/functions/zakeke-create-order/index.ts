import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createZakekeOrder } from "../_shared/zakeke.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Called from Stripe / Montonio webhooks after a successful payment.
 * Body: { order_id: string }
 * - Reads order_items for that order
 * - For each item with a zakeke_design_id and no zakeke_order_id yet,
 *   creates a Zakeke order and stores the returned id back on the row.
 *
 * If an item has no zakeke_design_id (e.g. non-customised product), it is
 * silently skipped. Errors per-item are logged but don't fail the whole call.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body?.order_id;
    if (!orderId || typeof orderId !== "string") {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: items, error } = await supabase
      .from("order_items")
      .select("id, quantity, unit_price, zakeke_design_id, zakeke_order_id, zakeke_visitor_code, created_at, selected_sizes, is_bulk, size")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Pull order header for customer email + currency + totals (debug-friendly).
    const { data: orderRow } = await supabase
      .from("orders")
      .select("guest_email, user_id, total, order_number, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_phone, created_at")
      .eq("id", orderId)
      .maybeSingle();

    let customerEmail: string | null = orderRow?.guest_email ?? null;
    if (!customerEmail && orderRow?.user_id) {
      const { data: prof } = await supabase.auth.admin.getUserById(orderRow.user_id);
      customerEmail = prof?.user?.email ?? null;
    }

    const shippingAddress = orderRow?.shipping_address
      ? {
          name: orderRow.shipping_name ?? "",
          address1: orderRow.shipping_address ?? "",
          city: orderRow.shipping_city ?? "",
          zip: orderRow.shipping_zip ?? "",
          country: "LV",
          phone: orderRow.shipping_phone ?? "",
        }
      : null;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customisedItems = items.filter(
      (it) => it.zakeke_design_id && !it.zakeke_order_id
    );

    if (customisedItems.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, skipped: items.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    const errors: Array<{ item_id: string; error: string }> = [];

    // Build a short, human-friendly external order code so it's easy to
    // cross-reference in Zakeke's admin UI ("Number" column) and on
    // invoices/labels.
    //
    // IMPORTANT: prefix with "TB-" so the orderCode is globally unique across
    // all Zakeke tenants. Without the prefix Zakeke has been observed to
    // ignore short numeric codes (e.g. "0125") and fall back to rendering
    // its internal UUIDs in the "Number" column — making the order
    // impossible to cross-reference with our invoices / bank statements.
    const baseCode = orderRow?.order_number != null
      ? String(orderRow.order_number).padStart(4, "0")
      : orderId.slice(0, 8).toUpperCase();
    const shortOrderCode = `TB-${baseCode}`;

    // Create one Zakeke order per item so that print-files map 1:1 with the row.
    for (let idx = 0; idx < customisedItems.length; idx++) {
      const it = customisedItems[idx];
      // Find this item's overall index across the order so the suffix
      // matches the row position the warehouse sees.
      const itemIndex = items.findIndex((x) => x.id === it.id);
      const suffix = items.length > 1 ? `-${(itemIndex >= 0 ? itemIndex : idx) + 1}` : "";
      const externalCode = `${shortOrderCode}${suffix}`;
      try {
        // For bulk (unified print) lines, surface the size breakdown so
        // production sees a single design needs to be applied across multiple
        // garment sizes. The Zakeke print-file logic itself is UNCHANGED — one
        // design id still generates one set of front/back files.
        let notes: string | null = null;
        if ((it as any).is_bulk && (it as any).selected_sizes) {
          const sizes = (it as any).selected_sizes as Record<string, number>;
          const breakdown = Object.entries(sizes)
            .map(([s, n]) => `${n}×${s}`)
            .join(", ");
          notes = `BULK / unified print size. Total ${it.quantity} pcs. Breakdown: ${breakdown}.`;
        }
        const { zakekeOrderId, orderItemIds } = await createZakekeOrder({
          externalOrderId: externalCode,
          visitorCode: (it as any).zakeke_visitor_code ?? null,
          customerEmail: customerEmail ?? undefined,
          customerName: orderRow?.shipping_name ?? undefined,
          currency: "EUR",
          orderDate: orderRow?.created_at ?? undefined,
          subtotal: Number((it as any).unit_price ?? 0) * (it.quantity ?? 1),
          totalAmount: Number((it as any).unit_price ?? 0) * (it.quantity ?? 1),
          shippingAddress,
          notes,
          items: [
            {
              designId: it.zakeke_design_id as string,
              quantity: it.quantity ?? 1,
              unitPrice: Number((it as any).unit_price ?? 0),
              reference: it.id,
            },
          ],
        });

        const { error: upErr } = await supabase
          .from("order_items")
          .update({
            zakeke_order_id: zakekeOrderId,
            zakeke_order_item_id: orderItemIds[0] ?? null,
          })
          .eq("id", it.id);
        if (upErr) throw upErr;
        processed += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`zakeke-create-order item ${it.id} failed:`, msg);
        errors.push({ item_id: it.id, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ ok: errors.length === 0, processed, errors }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("zakeke-create-order error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});