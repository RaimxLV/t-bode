const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = (Deno.env.get("ZAKEKE_API_KEY") ?? "").trim();
    const clientSecret = (Deno.env.get("ZAKEKE_CLIENT_SECRET") ?? "").trim();

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Zakeke credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let visitorCode = "";
    try {
      const reqBody = await req.json();
      visitorCode = reqBody?.visitorCode || "";
    } catch {
      // no body
    }

    // Exact format as curl -u "clientId:secret" -d "param=value" -d "param=value"
    const credentials = `${clientId}:${clientSecret}`;
    const basicAuth = btoa(credentials);

    // Build body exactly like curl does with separate -d flags
    const parts = [
      "grant_type=client_credentials",
      "access_type=S2S",
    ];
    if (visitorCode) {
      parts.push(`visitorcode=${encodeURIComponent(visitorCode)}`);
    }
    const rawBody = parts.join("&");

    console.log("Request body:", rawBody, "auth length:", basicAuth.length);

    const tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: rawBody,
    });

    const resText = await tokenRes.text();
    console.log("Response:", tokenRes.status, resText.substring(0, 300));

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
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
