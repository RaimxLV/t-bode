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

    // Parse request body for optional visitorcode
    let visitorCode = "";
    try {
      const reqBody = await req.json();
      visitorCode = reqBody?.visitorCode || "";
    } catch {
      // no body
    }

    // Use Basic Auth (recommended by Zakeke docs)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const params: Record<string, string> = {
      grant_type: "client_credentials",
      access_type: "S2S",
    };
    if (visitorCode) {
      params.visitorcode = visitorCode;
    }
    const body = new URLSearchParams(params);

    console.log("ClientID:", clientId, "Secret length:", clientSecret.length, "visitor:", visitorCode);
    console.log("Body:", body.toString());

    const tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    const resText = await tokenRes.text();
    console.log("Zakeke response:", tokenRes.status, resText.substring(0, 500));

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
