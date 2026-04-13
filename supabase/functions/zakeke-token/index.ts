const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

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

    // Try body-based credentials as fallback
    const params: Record<string, string> = {
      grant_type: "client_credentials",
      access_type: "S2S",
      client_id: clientId,
      client_secret: clientSecret,
    };
    if (visitorCode) {
      params.visitorcode = visitorCode;
    }
    const body = new URLSearchParams(params);

    console.log("Requesting Zakeke token, method: body-based, clientId:", clientId);

    // First try with Basic Auth
    const basicAuth = toBase64(`${clientId}:${clientSecret}`);
    let tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        access_type: "S2S",
        ...(visitorCode ? { visitorcode: visitorCode } : {}),
      }).toString(),
    });

    console.log("Basic auth attempt:", tokenRes.status);

    // If Basic Auth fails, try body-based
    if (!tokenRes.ok) {
      console.log("Falling back to body-based credentials");
      tokenRes = await fetch("https://api.zakeke.com/token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      console.log("Body-based attempt:", tokenRes.status);
    }

    const resText = await tokenRes.text();
    console.log("Zakeke response:", tokenRes.status, resText.substring(0, 200));

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
