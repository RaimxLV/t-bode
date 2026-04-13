const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      access_type: "S2S",
    });

    // Basic Authentication: base64(ClientID:SecretKey)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    console.log("Requesting Zakeke token with Basic Auth, clientId:", clientId, "visitorCode:", visitorCode);

    const tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    const resText = await tokenRes.text();
    console.log("Zakeke response status:", tokenRes.status, "body:", resText.substring(0, 500));

    if (!tokenRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to get Zakeke token", status: tokenRes.status, detail: resText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(resText);
    } catch {
      tokenData = { raw: resText };
    }

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
