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
  /** Optional reference back to our internal order_item.id */
  reference?: string;
}

export interface ZakekeOutputFile {
  name: string;
  url: string;
  /** Side / file kind (e.g. "front", "production", "mockup", "original_upload"). */
  side?: string | null;
  designId?: string | null;
  /** Zakeke-side order item id when known */
  orderItemId?: string | null;
}

/**
 * Create a Zakeke order tied to one of our paid orders. Returns the
 * Zakeke-side order id and the per-design order-item ids we use later
 * to fetch the production files via `GET /v1/order-items/{id}/files`.
 *
 * Tries the canonical `POST /v1/orders` first, then falls back to the
 * older `POST /v2/order` for accounts on legacy plans.
 */
export async function createZakekeOrder(opts: {
  externalOrderId: string;
  items: ZakekeOrderItemInput[];
}): Promise<{ zakekeOrderId: string; orderItemIds: string[]; raw: any }> {
  const token = await getZakekeS2SToken();

  const payload = {
    code: opts.externalOrderId,
    designs: opts.items.map((it) => ({
      designId: it.designId,
      quantity: it.quantity,
      reference: it.reference ?? null,
    })),
  };

  const endpoints = [
    `${ZAKEKE_BASE}/v1/orders`,
    `${ZAKEKE_BASE}/v2/order`,
  ];

  let res: Response | null = null;
  let text = "";
  let lastErr = "";
  for (const url of endpoints) {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    text = await res.text();
    if (res.ok) break;
    lastErr = `${res.status} @ ${url}: ${text.slice(0, 200)}`;
  }
  if (!res || !res.ok) {
    throw new Error(`Zakeke create order failed — ${lastErr}`);
  }

  let data: any = {};
  try { data = JSON.parse(text); } catch { /* keep empty */ }

  const zakekeOrderId =
    data?.id ?? data?.orderId ?? data?.orderID ?? data?.order?.id ?? null;
  if (!zakekeOrderId) {
    throw new Error(`Zakeke create order: no id in response — ${text}`);
  }

  // Pull Zakeke-side order-item ids from whichever shape the API returned.
  const itemsList: any[] =
    data?.orderItems ?? data?.items ?? data?.designs ?? data?.order?.orderItems ?? [];
  const orderItemIds = itemsList
    .map((it) => it?.orderItemId ?? it?.orderItemID ?? it?.id ?? null)
    .filter((x: unknown) => x !== null && x !== undefined)
    .map(String);

  return { zakekeOrderId: String(zakekeOrderId), orderItemIds, raw: data };
}

/**
 * Fetch high-resolution production files for a single Zakeke order-item.
 *
 * Per Zakeke REST API docs:
 *   GET /api/v1/order-items/{orderItemId}/files
 *
 * Returns the print-ready PDFs/PNGs, original customer uploads, mockups,
 * and work-order PDF — the same bundle WooCommerce delivers as a ZIP.
 */
export async function getZakekeOrderItemFiles(
  orderItemId: string
): Promise<ZakekeOutputFile[]> {
  const token = await getZakekeS2SToken();
  const url = `${ZAKEKE_BASE}/v1/order-items/${encodeURIComponent(orderItemId)}/files`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Zakeke order-item files failed ${res.status}: ${text.slice(0, 300)}`
    );
  }
  let data: any;
  try { data = JSON.parse(text); } catch {
    throw new Error("Zakeke order-item files: non-JSON response");
  }

  const list: any[] = Array.isArray(data) ? data : (data?.files ?? data?.items ?? []);
  const out: ZakekeOutputFile[] = [];
  for (const f of list) {
    const fileUrl = f?.url ?? f?.fileUrl ?? f?.downloadUrl ?? f?.link;
    if (!fileUrl) continue;
    out.push({
      name: f?.name ?? f?.fileName ?? f?.type ?? "print-file",
      url: String(fileUrl),
      side: f?.side ?? f?.sideName ?? f?.type ?? f?.kind ?? null,
      designId: f?.designId ? String(f.designId) : null,
      orderItemId,
    });
  }
  return out;
}

/**
 * Fetch all production files for a Zakeke order. Iterates over each
 * order-item ID we already saved when creating the order. If we don't
 * have the per-item ids cached, falls back to resolving the order first
 * via the legacy endpoints.
 */
export async function getZakekeOrderOutputFiles(
  zakekeOrderId: string,
  orderItemIds?: string[]
): Promise<ZakekeOutputFile[]> {
  const out: ZakekeOutputFile[] = [];

  // Preferred path: we already know the Zakeke order-item ids.
  if (orderItemIds && orderItemIds.length > 0) {
    for (const itemId of orderItemIds) {
      try {
        const files = await getZakekeOrderItemFiles(itemId);
        out.push(...files);
      } catch (e) {
        console.error(`getZakekeOrderItemFiles(${itemId}):`, e);
      }
    }
    if (out.length > 0) return out;
  }

  // Fallback: resolve the order to discover its order-item ids.
  const token = await getZakekeS2SToken();
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
    const itemsList: any[] =
      data?.orderItems ?? data?.items ?? data?.designs ?? data?.order?.orderItems ?? [];
    const ids = itemsList
      .map((it) => it?.orderItemId ?? it?.orderItemID ?? it?.id ?? null)
      .filter((x: unknown) => !!x)
      .map(String);

    for (const id of ids) {
      try {
        const files = await getZakekeOrderItemFiles(id);
        out.push(...files);
      } catch (e) {
        console.error(`getZakekeOrderItemFiles(${id}):`, e);
      }
    }
    if (out.length > 0) return out;
    lastError = `No production files yet (order ${zakekeOrderId})`;
  }
  if (out.length === 0) {
    throw new Error(`Zakeke output-files: ${lastError || "no files"}`);
  }
  return out;
}
