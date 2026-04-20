import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  // STRICT: signature verification is mandatory. No fallback.
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured. Refusing request.");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!signature) {
    console.error("Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.error("No order_id in session metadata");
          break;
        }

        const updateData: any = {
          status: "confirmed",
          stripe_session_id: session.id,
        };

        // Capture invoice info if it was created (business orders)
        if (session.invoice) {
          const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice.id;
          try {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            updateData.stripe_invoice_id = invoiceId;
            updateData.stripe_invoice_pdf = invoice.invoice_pdf ?? null;
          } catch (e: any) {
            console.error("Failed to fetch invoice PDF:", e.message);
          }
        }

        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId);

        if (updateError) throw updateError;
        console.log(`✅ Order ${orderId} confirmed`);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
        }
        break;
      }

      case "invoice.finalized": {
        const invoice = event.data.object as Stripe.Invoice;
        const orderId = invoice.metadata?.order_id;
        if (orderId) {
          await supabase
            .from("orders")
            .update({ stripe_invoice_id: invoice.id, stripe_invoice_pdf: invoice.invoice_pdf ?? null })
            .eq("id", orderId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook handler error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
