// Renders an invoice PDF WITHOUT persisting it — used by admins to preview
// the template/layout before committing a new version via generate-invoice.
// Accepts the same buyer_overrides/notes shape as generate-invoice.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { generateInvoicePdf, type InvoiceData } from "../_shared/invoice-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  order_id?: string;
  buyer_overrides?: Partial<{
    name: string; address: string; reg_number: string; vat_number: string; email: string; phone: string;
  }>;
  notes?: string;
  sample?: boolean; // if true (or no order_id), render with mock data
}

function sampleData(seller: any): InvoiceData {
  return {
    invoice_number: "TB-PREVIEW",
    order_number: 9999,
    issue_date: new Date().toISOString(),
    buyer: {
      is_business: true,
      name: "SIA Paraugs",
      address: "Brīvības iela 100, Rīga, LV-1011",
      reg_number: "40000000000",
      vat_number: "LV40000000000",
      email: "paraugs@example.lv",
      phone: "+371 20000000",
      shipping_address: "Brīvības iela 100, Rīga, LV-1011",
    },
    seller,
    items: [
      { name: "T-krekls ar apdruku (paraugs)", quantity: 2, unit_price_gross: 19.99, size: "L", color: "Melns", sku: "STTU169_BLK_L", unit: "gab" },
      { name: "Hūdijs ar apdruku (paraugs)", quantity: 1, unit_price_gross: 39.50, size: "M", color: "Pelēks", sku: "STSU822_GRY_M", unit: "gab" },
      { name: "Krūze ar apdruku (paraugs)", quantity: 3, unit_price_gross: 9.90, sku: "MUG_WHT", unit: "gab" },
    ],
    shipping_gross: 3.99,
    discount_gross: 5.00,
    vat_rate: 21,
    notes: "Šis ir ŠABLONA PRIEKŠSKATĪJUMS — netiek saglabāts datu bāzē.",
    payment_method: "bank_transfer",
    version: 1,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin-only
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const { data: userData } = await service.auth.getUser(token);
    if (!userData?.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const { data: roleRow } = await service.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    let isAdmin = !!roleRow;
    if (!isAdmin && userData.user.email) {
      const { data: wl } = await service.rpc("is_admin_whitelisted", { _email: userData.user.email });
      isAdmin = !!wl;
    }
    if (!isAdmin) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    const { data: settings } = await service.from("site_settings").select("*").limit(1).maybeSingle();
    if (!settings) throw new Error("Site settings not configured");

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
      bank2_name: (settings as any).bank2_name ?? null,
      bank2_iban: (settings as any).bank2_iban ?? null,
      bank2_swift: (settings as any).bank2_swift ?? null,
      issued_by_name: (settings as any).issued_by_name ?? null,
      tagline: (settings as any).tagline ?? null,
    };

    let data: InvoiceData;

    if (!body.order_id || body.sample) {
      data = sampleData(seller);
    } else {
      // Build exactly like generate-invoice, but do not write anywhere.
      const { data: order } = await service.from("orders").select("*").eq("id", body.order_id).maybeSingle();
      if (!order) throw new Error("Order not found");
      const { data: items } = await service
        .from("order_items").select("*, products:product_id(slug)")
        .eq("order_id", body.order_id);

      let buyerEmail: string | null = order.guest_email ?? null;
      if (!buyerEmail && order.user_id) {
        const { data: u } = await service.auth.admin.getUserById(order.user_id);
        buyerEmail = u?.user?.email ?? null;
      }

      const shippingAddrParts = [order.shipping_address, order.shipping_city, order.shipping_zip].filter(Boolean).join(", ");
      const pickupLabel = order.montonio_pickup_point_name ?? order.omniva_pickup_point ?? null;
      const shippingDisplay = shippingAddrParts || pickupLabel || null;

      const buyer = {
        is_business: !!order.is_business,
        name: body.buyer_overrides?.name
          ?? (order.is_business ? (order.company_name ?? order.shipping_name ?? "") : (order.shipping_name ?? "")),
        address: body.buyer_overrides?.address
          ?? (order.is_business ? (order.company_address ?? shippingAddrParts) : shippingAddrParts),
        reg_number: body.buyer_overrides?.reg_number ?? order.company_reg_number ?? null,
        vat_number: body.buyer_overrides?.vat_number ?? order.company_vat_number ?? null,
        email: body.buyer_overrides?.email ?? buyerEmail,
        phone: body.buyer_overrides?.phone ?? order.shipping_phone ?? null,
        shipping_address: shippingDisplay,
        ip_country: (order as any).buyer_country ?? null,
        ip_address: (order as any).buyer_ip ?? null,
      };

      const invoiceItems = (items ?? []).map((it: any) => {
        const slug = it.products?.slug ?? null;
        const colorCode = it.color ? String(it.color).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) : "";
        const sizeCode = it.size ? String(it.size).toUpperCase() : "";
        const skuParts = [slug, colorCode, sizeCode].filter(Boolean);
        return {
          name: it.product_name,
          quantity: Number(it.quantity),
          unit_price_gross: Number(it.unit_price),
          size: it.size, color: it.color,
          sku: skuParts.length ? skuParts.join("_") : null,
          unit: "gab",
        };
      });

      const itemsGrossSum = invoiceItems.reduce((s, it) => s + it.unit_price_gross * it.quantity, 0);
      const discountGross = Number(order.discount_amount ?? 0);
      const orderTotal = Number(order.total ?? 0);
      const shippingGross = Math.max(0, Math.round((orderTotal - itemsGrossSum + discountGross) * 100) / 100);

      // Try to keep the existing invoice number, just append PREVIEW marker.
      const { data: existing } = await service.from("invoices")
        .select("invoice_number, version").eq("order_id", body.order_id)
        .order("version", { ascending: false }).limit(1);
      const baseNum = existing?.[0]?.invoice_number ?? "TB-PREVIEW";
      const nextVer = (existing?.[0]?.version ?? 0) + 1;

      data = {
        invoice_number: `${baseNum} (PRIEKŠSKATĪJUMS)`,
        order_number: order.order_number,
        issue_date: new Date().toISOString(),
        buyer, seller, items: invoiceItems,
        discount_gross: discountGross,
        shipping_gross: shippingGross,
        vat_rate: 21,
        notes: body.notes ?? null,
        payment_method: order.payment_method,
        version: nextVer,
      };
    }

    const { bytes } = await generateInvoicePdf(data);

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preview.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("preview-invoice error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});