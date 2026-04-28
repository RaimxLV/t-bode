/**
 * Shared Zakeke API helpers for edge functions.
 *
 * Token endpoint uses S2S (server-to-server) flow with client_credentials.
 * The Zakeke order endpoints live under https://api.zakeke.com.
 */

const ZAKEKE_BASE = "https://api.zakeke.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getZakekeS2SToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const clientId = (Deno.env.get("ZAKEKE_API_KEY") ?? "").trim();
  const clientSecret = (Deno.env.get("ZAKEKE_CLIENT_SECRET") ?? "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("Zakeke credentials not configured");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const body = [
    "grant_type=client_credentials",
    `client_id=${encodeURIComponent(clientId)}`,
    `client_secret=${encodeURIComponent(clientSecret)}`,
    "access_type=S2S",
  ].join("&");

  const res = await fetch(`${ZAKEKE_BASE}/token`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zakeke token error ${res.status}: ${text || "(empty)"}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Zakeke token response not JSON: ${text}`);
  }

  const token = data?.access_token as string | undefined;
  if (!token) {
    throw new Error(`Zakeke token missing access_token: ${text}`);
  }
  const ttlSec = Number(data?.expires_in ?? 3600);
  cachedToken = { token, expiresAt: now + ttlSec * 1000 };
  return token;
}

export interface ZakekeOrderItemInput {
  designId: string;
  quantity: number;
  // Optional reference back to our internal order_item.id
  reference?: string;
}

/**
 * Create a Zakeke order tied to one of our paid orders. Returns the
 * Zakeke-side order id we can later use to deep-link or fetch print files.
 */
export async function createZakekeOrder(opts: {
  externalOrderId: string;
  items: ZakekeOrderItemInput[];
}): Promise<{ zakekeOrderId: string; raw: any }> {
  const token = await getZakekeS2SToken();

  // Zakeke "Order" V2 endpoint accepts a list of designs with quantities and
  // an external code we can use for cross-reference.
  const payload = {
    code: opts.externalOrderId,
    designs: opts.items.map((it) => ({
      designId: it.designId,
      quantity: it.quantity,
      reference: it.reference ?? null,
    })),
  };

  const res = await fetch(`${ZAKEKE_BASE}/v2/order`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zakeke create order failed ${res.status}: ${text}`);
  }
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* keep empty */ }

  const zakekeOrderId =
    data?.id ?? data?.orderId ?? data?.orderID ?? data?.order?.id ?? null;

  if (!zakekeOrderId) {
    throw new Error(`Zakeke create order: no id in response — ${text}`);
  }
  return { zakekeOrderId: String(zakekeOrderId), raw: data };
}

/**
 * Request the print-files archive for a Zakeke order. Some plans return a
 * direct download URL; others return a job that must be polled. We try the
 * direct endpoint first and fall back to the alternate path.
 */
export async function getZakekeOrderPrintFilesUrl(
  zakekeOrderId: string
): Promise<string> {
  const token = await getZakekeS2SToken();

  const candidates = [
    `${ZAKEKE_BASE}/v2/order/${encodeURIComponent(zakekeOrderId)}/print-files`,
    `${ZAKEKE_BASE}/v2/orders/${encodeURIComponent(zakekeOrderId)}/print-files`,
    `${ZAKEKE_BASE}/v1/order/${encodeURIComponent(zakekeOrderId)}/printfiles`,
  ];

  let lastError = "";
  for (const url of candidates) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      lastError = `${res.status} @ ${url}: ${text.slice(0, 200)}`;
      continue;
    }
    try {
      const data = JSON.parse(text);
      const directUrl =
        data?.url ?? data?.downloadUrl ?? data?.zipUrl ?? data?.archiveUrl ?? null;
      if (directUrl) return String(directUrl);
    } catch {
      // If response is not JSON but the request succeeded, treat the body as URL
      if (text.startsWith("http")) return text.trim();
    }
    lastError = `OK but no URL in response @ ${url}: ${text.slice(0, 200)}`;
  }
  throw new Error(`Zakeke print-files: ${lastError || "all endpoints failed"}`);
}