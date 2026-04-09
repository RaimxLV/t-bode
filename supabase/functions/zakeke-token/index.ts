import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("ZAKEKE_API_KEY");
    const clientSecret = Deno.env.get("ZAKEKE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Zakeke credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse optional visitor/customer codes from request body
    let visitorCode = "";
    let customerCode = "";
    try {
      const body = await req.json();
      visitorCode = body.visitorCode || "";
      customerCode = body.customerCode || "";
    } catch {
      // No body is fine
    }

    // Get C2S token from Zakeke OAuth
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    if (visitorCode) params.set("visitorcode", visitorCode);
    if (customerCode) params.set("customercode", customerCode);

    const tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Zakeke token error:", tokenRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to get Zakeke token", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenRes.json();

    return new Response(JSON.stringify(tokenData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Zakeke token error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
