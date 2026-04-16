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
    // Try to authenticate user (optional for guest checkout)
    let user: { id: string; email: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: authData } = await supabaseClient.auth.getUser(token);
      if (authData.user?.email) {
        user = { id: authData.user.id, email: authData.user.email };
      }
    }

    const { order_id, items, origin_url, guest_email, business } = await req.json();

    if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing order_id or items");
    }

    // Determine customer email
    const customerEmail = user?.email ?? guest_email;
    if (!customerEmail) throw new Error("Email required for checkout");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else if (business?.is_business) {
      // Create customer up front for business so we can attach invoice details
      const newCustomer = await stripe.customers.create({
        email: customerEmail,
        name: business.company_name,
        address: business.company_address ? { line1: business.company_address } : undefined,
        metadata: {
          company_name: business.company_name ?? "",
          company_reg_number: business.company_reg_number ?? "",
          company_vat_number: business.company_vat_number ?? "",
        },
      });
      customerId = newCustomer.id;
    }

    // Build line items
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

    // Add shipping
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
      success_url: `${origin_url}/payment-success?order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin_url}/checkout`,
      metadata: {
        order_id,
        user_id: user?.id ?? "",
        guest_email: user ? "" : (guest_email ?? ""),
        is_business: business?.is_business ? "true" : "false",
      },
    };

    // Enable invoice creation for business orders → generates branded PDF invoice
    if (business?.is_business) {
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          description: `T-Bode pasūtījums ${order_id.slice(0, 8).toUpperCase()}`,
          metadata: {
            order_id,
            company_name: business.company_name ?? "",
            company_reg_number: business.company_reg_number ?? "",
            company_vat_number: business.company_vat_number ?? "",
          },
          custom_fields: [
            ...(business.company_reg_number ? [{ name: "Reģ. Nr.", value: business.company_reg_number }] : []),
            ...(business.company_vat_number ? [{ name: "PVN Nr.", value: business.company_vat_number }] : []),
          ].slice(0, 4),
          footer: "Paldies, ka iepērkaties pie T-Bode!",
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update order with stripe session id (use service role for guest orders)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
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
