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
    const bodyParts = ["grant_type=client_credentials", "access_type=S2S"];
    if (visitorCode) {
      bodyParts.push(`visitorcode=${encodeURIComponent(visitorCode)}`);
    }
    const rawBody = bodyParts.join("&");

    // Use explicit Headers object to control what gets sent
    const headers = new Headers();
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    headers.set("Authorization", `Basic ${basicAuth}`);
    // Fix: Zakeke rejects Accept-Language: * which Deno runtime adds by default
    headers.set("Accept-Language", "en-US,en;q=0.9");
    // Fix: Set explicit Accept-Encoding to prevent runtime adding gzip,br
    headers.set("Accept-Encoding", "identity");
    // Override User-Agent to avoid Deno/Supabase identification issues
    headers.set("User-Agent", "T-Bode/1.0");

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
