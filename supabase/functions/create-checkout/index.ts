import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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
      promo, // { code, discount_type, discount_amount } | null
    } = await req.json();

    if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing order_id or items");
    }

    const customerEmail = user?.email ?? guest_email;
    if (!customerEmail) throw new Error("Email required for checkout");

    // Capture buyer country from edge headers (Cloudflare/Supabase add cf-ipcountry).
    const buyerCountry = (
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-country") ||
      ""
    ).toUpperCase().slice(0, 2) || null;
    // Capture buyer IP (first hop in x-forwarded-for, falls back to other headers).
    const buyerIp = (
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      ""
    ).slice(0, 64) || null;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SECURITY: verify the caller owns this order. For authenticated users the
    // order.user_id must match the JWT subject; for guest checkouts the order
    // must be a guest order (user_id null) and the supplied guest_email must
    // match what is on the order. Without this check, anyone who learned an
    // order UUID could apply promo codes or flip order state on someone else's
    // order.
    const { data: ownerRow, error: ownerErr } = await serviceClient
      .from("orders")
      .select("user_id, guest_email")
      .eq("id", order_id)
      .maybeSingle();
    if (ownerErr || !ownerRow) throw new Error("Order not found");
    if (user) {
      if (ownerRow.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const orderEmail = (ownerRow.guest_email ?? "").toLowerCase();
      const reqEmail = (guest_email ?? "").toLowerCase();
      if (ownerRow.user_id !== null || !orderEmail || orderEmail !== reqEmail) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // SECURITY: Recompute line items from DB. The client may send `items` for
    // metadata (image, shippingCost), but unit prices MUST come from DB.
    const { data: dbItems, error: dbItemsErr } = await serviceClient
      .from("order_items")
      .select("id, product_id, product_name, quantity, unit_price, size, color")
      .eq("order_id", order_id);
    if (dbItemsErr || !dbItems || dbItems.length === 0) {
      throw new Error("Order items not found");
    }

    // Atomically redeem the promo code (re-validates server-side and increments usage).
    // Returns the actual discount amount; if validation fails we abort the checkout.
    let appliedDiscount = 0;
    let appliedPromoCode: string | null = null;
    if (promo?.code) {
      const orderTotalForValidation = dbItems.reduce(
        (sum: number, it: any) => sum + Number(it.unit_price) * Number(it.quantity),
        0,
      );
      const { data: redeemed, error: redeemErr } = await serviceClient.rpc("redeem_promo_code", {
        _code: promo.code,
        _order_id: order_id,
        _order_total: orderTotalForValidation,
      });
      if (redeemErr) {
        console.error("Promo redeem failed:", redeemErr.message);
        throw new Error(`Promo code error: ${redeemErr.message}`);
      }
      appliedDiscount = Number(redeemed) || 0;
      appliedPromoCode = promo.code;

      // Free-shipping discount: redeem function returns 0 for product savings;
      // we instead zero out the shipping line by mutating the items array below.
      if (promo.discount_type === "free_shipping") {
        for (const it of items) it.shippingCost = 0;
        appliedDiscount = 0; // no product-level discount
      }

      // Persist on order
      await serviceClient
        .from("orders")
        .update({ promo_code: appliedPromoCode, discount_amount: promo.discount_type === "free_shipping" ? Number(promo.discount_amount) : appliedDiscount })
        .eq("id", order_id);
    }

    // ========================================
    // BANK TRANSFER FLOW — T-BODE branded email (no Stripe)
    // ========================================
    if (payment_method === "bank_transfer") {
      // Trigger our own bank-instructions email (uses site_settings + email infra)
      const { error: emailErr } = await serviceClient.functions.invoke(
        "send-bank-instructions",
        { body: { order_id, lang: "lv" } },
      );
      if (emailErr) {
        console.warn("send-bank-instructions failed (continuing):", emailErr.message);
      }
      await serviceClient
        .from("orders")
        .update({
          status: "pending",
          ...(buyerCountry ? { buyer_country: buyerCountry } : {}),
          ...(buyerIp ? { buyer_ip: buyerIp } : {}),
        })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({
          url: `${origin_url}/payment-success?order_id=${order_id}&method=bank`,
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
    const stripe = createStripeClient();

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

    // Build line items from DB-authoritative prices. Image (display only) may
    // come from the matching client item by product_id.
    const clientImageByProduct = new Map<string, string>();
    for (const it of items as any[]) {
      if (it?.productId && it?.image) clientImageByProduct.set(it.productId, it.image);
    }
    const line_items = dbItems.map((item: any) => {
      const image = item.product_id ? clientImageByProduct.get(item.product_id) : undefined;
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: item.product_name,
            ...(image ? { images: [image] } : {}),
            metadata: {
              product_id: item.product_id ?? "",
              size: item.size || "",
              color: item.color || "",
            },
          },
          unit_amount: Math.round(Number(item.unit_price) * 100),
        },
        quantity: Number(item.quantity),
      };
    });

    // Shipping cost from DB (orders.shipping_cost), not client.
    const { data: orderRow } = await serviceClient
      .from("orders")
      .select("shipping_cost")
      .eq("id", order_id)
      .maybeSingle();
    const shippingCost =
      promo?.discount_type === "free_shipping" ? 0 : Number(orderRow?.shipping_cost ?? 0);
    if (shippingCost > 0) {
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

    // For card flow, apply discount via Stripe coupon (Checkout doesn't allow negative line items).
    let stripeDiscounts: { coupon: string }[] | undefined;
    if (appliedDiscount > 0 && appliedPromoCode) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(appliedDiscount * 100),
        currency: "eur",
        duration: "once",
        name: `Atlaide ${appliedPromoCode}`,
        max_redemptions: 1,
      });
      stripeDiscounts = [{ coupon: coupon.id }];
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
        promo_code: appliedPromoCode ?? "",
        discount_amount: appliedDiscount ? appliedDiscount.toFixed(2) : "0",
      },
    };
    if (stripeDiscounts) sessionParams.discounts = stripeDiscounts;

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
      .update({
        stripe_session_id: session.id,
        ...(buyerCountry ? { buyer_country: buyerCountry } : {}),
        ...(buyerIp ? { buyer_ip: buyerIp } : {}),
      })
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
