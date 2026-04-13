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

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const bodyParams = new URLSearchParams({
      grant_type: "client_credentials",
      access_type: "S2S",
      ...(visitorCode ? { visitorcode: visitorCode } : {}),
    });

    // Debug: hash the secret to compare with sandbox
    const encoder = new TextEncoder();
    const secretData = encoder.encode(clientSecret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", secretData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    console.log("Secret hash (first 16):", hashHex.substring(0, 16));

    console.log("Zakeke request:", clientId, "body:", bodyParams.toString());

    const tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "User-Agent": "Mozilla/5.0",
      },
      body: bodyParams.toString(),
    });

    const resText = await tokenRes.text();
    const respHeaders: Record<string, string> = {};
    tokenRes.headers.forEach((v, k) => { respHeaders[k] = v; });
    console.log("Zakeke response:", tokenRes.status, "headers:", JSON.stringify(respHeaders));
    console.log("Zakeke body:", resText.substring(0, 500));

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
