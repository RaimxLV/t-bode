const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    let customerCode = "";
    let accessType = "C2S";
    try {
      const reqBody = await req.json();
      visitorCode = reqBody?.visitorCode || "";
      customerCode = reqBody?.customerCode || "";
      accessType = reqBody?.accessType === "S2S" ? "S2S" : "C2S";
    } catch {
      // no body
    }

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const bodyParts = ["grant_type=client_credentials", `access_type=${encodeURIComponent(accessType)}`];
    if (visitorCode) {
      bodyParts.push(`visitorcode=${encodeURIComponent(visitorCode)}`);
    }
    if (customerCode) {
      bodyParts.push(`customercode=${encodeURIComponent(customerCode)}`);
    }
    const rawBody = bodyParts.join("&");

    // Use explicit Headers object to control what gets sent
    const headers = new Headers();
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    headers.set("Authorization", `Basic ${basicAuth}`);
    headers.set("Accept-Language", "en-US,en;q=0.9");

    console.log("=== ZAKEKE TOKEN REQUEST ===");
    console.log("URL: https://api.zakeke.com/token");
    console.log("Method: POST");
    console.log("Body:", rawBody);
    console.log("Client ID length:", clientId.length);
    console.log("Client Secret length:", clientSecret.length);
    console.log("Request Headers:");
    headers.forEach((value, key) => {
      if (key === "authorization") {
        console.log(`  ${key}: Basic <redacted>`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

    // Force HTTP/1.1 to avoid potential HTTP/2 issues with Kestrel
    const httpClient = Deno.createHttpClient({ http1: true, http2: false });

    const tokenRes = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers,
      body: rawBody,
      // deno-lint-ignore no-explicit-any
      client: httpClient as any,
    });

    const resText = await tokenRes.text();
    httpClient.close();

    console.log("=== ZAKEKE TOKEN RESPONSE ===");
    console.log("Status:", tokenRes.status);
    console.log("Status Text:", tokenRes.statusText);
    console.log("Response Headers:");
    tokenRes.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log("Response Body:", resText || "(empty)");
    console.log("Response Body Length:", resText.length);
    console.log("=== END ===");

    if (!tokenRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to get Zakeke token",
          status: tokenRes.status,
          statusText: tokenRes.statusText,
          headers: Object.fromEntries(tokenRes.headers.entries()),
          detail: resText || "(empty body)",
        }),
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
