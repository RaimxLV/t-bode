import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    let user: { id: string; email: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: authData } = await supabaseClient.auth.getUser(token);
      if (authData.user?.email) {
        user = { id: authData.user.id, email: authData.user.email };
      }
    }

    const {
      order_id,
      items,
      origin_url,
      guest_email,
      business,
      payment_method, // "card" | "bank_transfer"
    } = await req.json();

    if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing order_id or items");
    }

    const customerEmail = user?.email ?? guest_email;
    if (!customerEmail) throw new Error("Email required for checkout");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load admin-managed site settings (company + bank details + payment instructions)
    const { data: siteSettings } = await serviceClient
      .from("site_settings")
      .select(
        "company_name, company_reg_number, company_vat_number, company_address, bank_name, bank_iban, bank_swift, bank_beneficiary, payment_instructions_lv, payment_instructions_en"
      )
      .limit(1)
      .maybeSingle();

    const settings = siteSettings ?? {
      company_name: "SIA Ervitex",
      company_reg_number: "",
      company_vat_number: "",
      company_address: "",
      bank_name: "Swedbank",
      bank_iban: "",
      bank_swift: "",
      bank_beneficiary: "SIA Ervitex",
      payment_instructions_lv:
        "Lūdzu norādiet pasūtījuma numuru maksājuma mērķī. Apmaksas termiņš — 3 darba dienas.",
      payment_instructions_en:
        "Please include the order number in the payment reference. Payment is due within 3 business days.",
    };

    const orderRef = order_id.slice(0, 8).toUpperCase();

    // Bilingual bank-transfer footer assembled from admin settings
    const bankFooter = [
      `${settings.payment_instructions_lv ?? ""} / ${settings.payment_instructions_en ?? ""}`.trim(),
      "",
      `Saņēmējs / Beneficiary: ${settings.bank_beneficiary}`,
      `Banka / Bank: ${settings.bank_name}`,
      `IBAN: ${settings.bank_iban}`,
      `SWIFT/BIC: ${settings.bank_swift}`,
      `Maksājuma mērķis / Reference: ${orderRef}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Card-flow footer (just thank-you + seller line)
    const cardFooter = `Paldies, ka iepērkaties pie ${settings.company_name}! / Thank you for shopping with ${settings.company_name}!`;

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else if (business?.is_business || payment_method === "bank_transfer") {
      const newCustomer = await stripe.customers.create({
        email: customerEmail,
        name: business?.is_business ? business.company_name : undefined,
        address: business?.company_address
          ? { line1: business.company_address }
          : undefined,
        metadata: {
          order_id,
          company_name: business?.company_name ?? "",
          company_reg_number: business?.company_reg_number ?? "",
          company_vat_number: business?.company_vat_number ?? "",
        },
      });
      customerId = newCustomer.id;
    }

    // ========================================
    // BANK TRANSFER FLOW — Stripe send_invoice
    // ========================================
    if (payment_method === "bank_transfer") {
      if (!customerId) throw new Error("Failed to create customer for bank transfer");

      // Add line items as invoice items
      for (const item of items) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: Math.round(item.price * 100) * item.quantity,
          currency: "eur",
          description: `${item.name}${item.size ? ` · ${item.size}` : ""}${item.color ? ` · ${item.color}` : ""}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`,
        });
      }

      // Shipping line
      const shippingCost = items[0]?.shippingCost;
      if (shippingCost) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: Math.round(shippingCost * 100),
          currency: "eur",
          description: items[0]?.shippingMethod === "omniva" ? "Omniva Piegāde" : "Kurjera Piegāde",
        });
      }

      // Buyer custom fields (only for B2B). Seller info goes into the footer
      // because Stripe limits custom_fields to 4 entries total.
      const buyerFields = business?.is_business
        ? [
            ...(business.company_reg_number
              ? [{ name: "Pircēja Reģ.Nr.", value: String(business.company_reg_number) }]
              : []),
            ...(business.company_vat_number
              ? [{ name: "Pircēja PVN Nr.", value: String(business.company_vat_number) }]
              : []),
          ]
        : [];

      const sellerFields = [
        ...(settings.company_reg_number
          ? [{ name: "Pārdevēja Reģ.Nr.", value: String(settings.company_reg_number) }]
          : []),
        ...(settings.company_vat_number
          ? [{ name: "Pārdevēja PVN Nr.", value: String(settings.company_vat_number) }]
          : []),
      ];

      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: 3,
        description: `${settings.company_name} — pasūtījums ${orderRef} — Bankas pārskaitījums`,
        metadata: {
          order_id,
          payment_method: "bank_transfer",
        },
        custom_fields: [...buyerFields, ...sellerFields].slice(0, 4),
        footer: bankFooter,
      });

      // Finalize and send invoice email
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      try {
        await stripe.invoices.sendInvoice(invoice.id);
      } catch (e) {
        console.warn("sendInvoice failed (continuing):", (e as Error).message);
      }

      // Save invoice metadata; keep order status pending
      await serviceClient
        .from("orders")
        .update({
          stripe_invoice_id: finalized.id,
          stripe_invoice_pdf: finalized.invoice_pdf ?? null,
          status: "pending",
        })
        .eq("id", order_id);

      // Return URL to local thank-you page (not Stripe)
      return new Response(
        JSON.stringify({
          url: `${origin_url}/payment-success?order_id=${order_id}&method=bank`,
          invoice_pdf: finalized.invoice_pdf,
          hosted_invoice_url: finalized.hosted_invoice_url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // ========================================
    // CARD FLOW — Stripe Checkout (original)
    // ========================================
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          ...(item.image ? { images: [item.image] } : {}),
          metadata: {
            product_id: item.productId,
            size: item.size || "",
            color: item.color || "",
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const shippingCost = items[0]?.shippingCost;
    if (shippingCost) {
      line_items.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: items[0]?.shippingMethod === "omniva" ? "Omniva Piegāde" : "Kurjera Piegāde",
            metadata: {},
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items,
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${origin_url}/payment-success?order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin_url}/checkout`,
      metadata: {
        order_id,
        user_id: user?.id ?? "",
        guest_email: user ? "" : (guest_email ?? ""),
        is_business: business?.is_business ? "true" : "false",
        payment_method: "card",
      },
    };

    if (business?.is_business) {
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          description: `${settings.company_name} — pasūtījums ${orderRef}`,
          metadata: {
            order_id,
            company_name: business.company_name ?? "",
            company_reg_number: business.company_reg_number ?? "",
            company_vat_number: business.company_vat_number ?? "",
          },
          custom_fields: [
            ...(business.company_reg_number
              ? [{ name: "Pircēja Reģ.Nr.", value: String(business.company_reg_number) }]
              : []),
            ...(business.company_vat_number
              ? [{ name: "Pircēja PVN Nr.", value: String(business.company_vat_number) }]
              : []),
            ...(settings.company_reg_number
              ? [{ name: "Pārdevēja Reģ.Nr.", value: String(settings.company_reg_number) }]
              : []),
            ...(settings.company_vat_number
              ? [{ name: "Pārdevēja PVN Nr.", value: String(settings.company_vat_number) }]
              : []),
          ].slice(0, 4),
          footer: cardFooter,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await serviceClient
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Checkout error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
