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
 * Fetch the high-resolution PRINT OUTPUT files for a Zakeke order.
 *
 * Zakeke distinguishes between:
 *   - preview / mockup images (low-res visualisation)
 *   - output files (high-res print-ready PDFs/PNGs that the producer uses)
 *
 * The official S2S endpoint is `GET /v1/orders/{code}` which returns the
 * order with each design's `outputFiles[]` (each item has `name` + `url`).
 * We first resolve the Zakeke order by our external code, then return the
 * first output file URL. If no output file is available yet (Zakeke is
 * still rendering), we surface a clear error so the admin UI can retry.
 */
export interface ZakekeOutputFile {
  name: string;
  url: string;
  side?: string | null;
  designId?: string | null;
}

export async function getZakekeOrderOutputFiles(
  zakekeOrderId: string
): Promise<ZakekeOutputFile[]> {
  const token = await getZakekeS2SToken();

  // Try both V1 and V2 endpoints — Zakeke accounts may differ.
  const candidates = [
    `${ZAKEKE_BASE}/v1/orders/${encodeURIComponent(zakekeOrderId)}`,
    `${ZAKEKE_BASE}/v2/order/${encodeURIComponent(zakekeOrderId)}`,
    `${ZAKEKE_BASE}/v2/orders/${encodeURIComponent(zakekeOrderId)}`,
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
    let data: any;
    try { data = JSON.parse(text); } catch {
      lastError = `non-JSON @ ${url}`;
      continue;
    }

    const out: ZakekeOutputFile[] = [];
    const designs: any[] =
      data?.designs ?? data?.items ?? data?.order?.designs ?? [];
    for (const d of designs) {
      const designId = d?.designId ?? d?.id ?? null;
      const files: any[] =
        d?.outputFiles ?? d?.printFiles ?? d?.files ?? [];
      for (const f of files) {
        const fileUrl = f?.url ?? f?.fileUrl ?? f?.downloadUrl;
        if (!fileUrl) continue;
        out.push({
          name: f?.name ?? f?.fileName ?? "print-file",
          url: String(fileUrl),
          side: f?.side ?? f?.sideName ?? null,
          designId: designId ? String(designId) : null,
        });
      }
    }
    if (out.length > 0) return out;
    lastError = `No outputFiles ready yet @ ${url}`;
  }
  throw new Error(`Zakeke output-files: ${lastError || "no files"}`);
}