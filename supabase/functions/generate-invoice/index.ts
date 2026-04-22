// Generate or regenerate a tax invoice PDF for an order.
// - Admin-triggered (with override fields) OR service-triggered (auto after payment)
// - Stores PDF in private 'invoices' bucket; writes row to public.invoices
// - Versioning: marks previous invoices for the order is_current=false, increments version
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { generateInvoicePdf, type InvoiceData } from "../_shared/invoice-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  order_id: string;
  // Optional admin overrides applied to buyer snapshot
  buyer_overrides?: Partial<{
    name: string;
    address: string;
    reg_number: string;
    vat_number: string;
    email: string;
    phone: string;
  }>;
  notes?: string;
  // When true, always create a new version even if one exists
  force_new_version?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authorization: either an admin user (for manual/edit) or service-role call (auto)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let isAdmin = false;
    if (token && token === serviceRoleKey) {
      isAdmin = true;
    } else if (token) {
      const { data: userData } = await service.auth.getUser(token);
      if (userData?.user) {
        const { data: roleRow } = await service
          .from("user_roles")
          .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
        isAdmin = !!roleRow;
        if (!isAdmin && userData.user.email) {
          const { data: wl } = await service.rpc("is_admin_whitelisted", { _email: userData.user.email });
          isAdmin = !!wl;
        }
      }
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load order + items + settings
    const { data: order, error: orderErr } = await service.from("orders").select("*").eq("id", body.order_id).maybeSingle();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: items } = await service.from("order_items").select("*").eq("order_id", body.order_id);
    const { data: settings } = await service.from("site_settings").select("*").limit(1).maybeSingle();
    if (!settings) throw new Error("Site settings not configured");

    // Resolve buyer email when missing
    let buyerEmail: string | null = order.guest_email ?? null;
    if (!buyerEmail && order.user_id) {
      const { data: u } = await service.auth.admin.getUserById(order.user_id);
      buyerEmail = u?.user?.email ?? null;
    }

    // Build buyer snapshot
    const buyer = {
      is_business: !!order.is_business,
      name: body.buyer_overrides?.name
        ?? (order.is_business ? (order.company_name ?? order.shipping_name ?? "") : (order.shipping_name ?? "")),
      address: body.buyer_overrides?.address
        ?? (order.is_business
            ? (order.company_address ?? [order.shipping_address, order.shipping_city, order.shipping_zip].filter(Boolean).join(", "))
            : [order.shipping_address, order.shipping_city, order.shipping_zip].filter(Boolean).join(", ")),
      reg_number: body.buyer_overrides?.reg_number ?? order.company_reg_number ?? null,
      vat_number: body.buyer_overrides?.vat_number ?? order.company_vat_number ?? null,
      email: body.buyer_overrides?.email ?? buyerEmail,
      phone: body.buyer_overrides?.phone ?? order.shipping_phone ?? null,
    };

    const seller = {
      company_name: settings.company_name,
      company_reg_number: settings.company_reg_number,
      company_vat_number: settings.company_vat_number,
      company_address: settings.company_address,
      bank_name: settings.bank_name,
      bank_iban: settings.bank_iban,
      bank_swift: settings.bank_swift,
      bank_beneficiary: settings.bank_beneficiary,
      logo_url: settings.logo_url,
      stamp_url: settings.stamp_url,
    };

    const invoiceItems = (items ?? []).map((it) => ({
      name: it.product_name,
      quantity: Number(it.quantity),
      unit_price_gross: Number(it.unit_price),
      size: it.size,
      color: it.color,
    }));

    // Determine version + number
    const { data: existing } = await service
      .from("invoices").select("id, invoice_number, version")
      .eq("order_id", body.order_id).order("version", { ascending: false });

    const isFirst = !existing || existing.length === 0;
    const nextVersion = isFirst ? 1 : (existing![0].version + 1);
    let invoiceNumber: string;
    if (isFirst || body.force_new_version) {
      if (isFirst) {
        const { data: numRes, error: numErr } = await service.rpc("next_invoice_number", { _year: new Date().getFullYear() });
        if (numErr) throw numErr;
        invoiceNumber = numRes as unknown as string;
      } else {
        // Keep number across versions, bump version only
        invoiceNumber = existing![0].invoice_number;
      }
    } else {
      invoiceNumber = existing![0].invoice_number;
    }

    const data: InvoiceData = {
      invoice_number: invoiceNumber,
      order_number: order.order_number,
      issue_date: new Date().toISOString(),
      buyer,
      seller,
      items: invoiceItems,
      discount_gross: Number(order.discount_amount ?? 0),
      vat_rate: 21,
      notes: body.notes ?? null,
      payment_method: order.payment_method,
      version: nextVersion,
    };

    const { bytes, totals } = await generateInvoicePdf(data);

    // Upload to Storage
    const pdfPath = `${order.id}/${invoiceNumber}_v${nextVersion}.pdf`;
    const { error: upErr } = await service.storage.from("invoices").upload(pdfPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    // Mark previous as not current
    if (!isFirst) {
      await service.from("invoices").update({ is_current: false }).eq("order_id", body.order_id);
    }

    const { data: inserted, error: insErr } = await service.from("invoices").insert({
      order_id: body.order_id,
      invoice_number: invoiceNumber,
      version: nextVersion,
      is_current: true,
      pdf_path: pdfPath,
      buyer_snapshot: buyer,
      seller_snapshot: seller,
      items_snapshot: invoiceItems,
      notes: body.notes ?? null,
      net_amount: totals.net,
      vat_rate: totals.vat_rate,
      vat_amount: totals.vat,
      gross_amount: totals.gross,
    }).select("id, invoice_number, version, pdf_path").single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, invoice: inserted, totals }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-invoice error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});