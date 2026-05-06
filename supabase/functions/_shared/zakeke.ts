/**
 * Shared Zakeke API helpers for edge functions.
 *
 * Token endpoint uses S2S (server-to-server) flow with client_credentials.
 * The Zakeke order endpoints live under https://api.zakeke.com.
 */

const ZAKEKE_BASE = "https://api.zakeke.com";

function maskSecretPrefix(value: string): string {
  return value ? `${value.slice(0, 4)}…` : "(empty)";
}

function getZakekeCredentials() {
  const clientId = (Deno.env.get("ZAKEKE_API_KEY") ?? "").trim();
  const clientSecret = (Deno.env.get("ZAKEKE_CLIENT_SECRET") ?? "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("Zakeke credentials not configured");
  }

  return { clientId, clientSecret };
}

export async function getZakekeS2SToken(opts?: {
  customerCode?: string;
  visitorCode?: string;
}): Promise<string> {
  const { clientId, clientSecret } = getZakekeCredentials();
  console.log(`[zakeke-auth] endpoint=${ZAKEKE_BASE}/token`);
  console.log(
    `[zakeke-auth] ZAKEKE_API_KEY prefix=${maskSecretPrefix(clientId)}`,
  );
  console.log(
    `[zakeke-auth] ZAKEKE_CLIENT_SECRET prefix=${maskSecretPrefix(clientSecret)}`,
  );

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const body = [
    "grant_type=client_credentials",
    `client_id=${encodeURIComponent(clientId)}`,
    `client_secret=${encodeURIComponent(clientSecret)}`,
    "access_type=S2S",
  ].join("&");
  const tokenParams = [body];
  if (opts?.visitorCode) {
    tokenParams.push(`visitorcode=${encodeURIComponent(opts.visitorCode)}`);
  }
  if (opts?.customerCode) {
    tokenParams.push(`customercode=${encodeURIComponent(opts.customerCode)}`);
  }

  const res = await fetch(`${ZAKEKE_BASE}/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: tokenParams.join("&"),
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
  return token;
}

export interface ZakekeOrderItemInput {
  designId: string;
  quantity: number;
  /** Per-unit price the customer paid (model + design extras). */
  unitPrice?: number;
  /** Optional reference back to our internal order_item.id */
  reference?: string;
  /** SKU of the underlying product variant (optional, helps Zakeke matching). */
  sku?: string | null;
}

export interface ZakekeShippingAddress {
  name: string;
  address1: string;
  city: string;
  zip: string;
  country: string;
  phone?: string | null;
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

async function resolveZakekeOrderByCode(
  orderCode: string,
  token: string,
): Promise<any | null> {
  const url = `${ZAKEKE_BASE}/v2/order/${encodeURIComponent(orderCode)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[zakeke-order-lookup] ${res.status} from ${url}: ${text.slice(0, 500)}`);
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error(`[zakeke-order-lookup] non-JSON response from ${url}: ${text.slice(0, 500)}`);
    return null;
  }
}

export async function getZakekeDesignZipFile(
  designId: string,
  modificationId?: string | null,
): Promise<ZakekeOutputFile | null> {
  const token = await getZakekeS2SToken();
  const url = modificationId
    ? `${ZAKEKE_BASE}/v1/designs/${encodeURIComponent(designId)}/outputfiles/zip/${encodeURIComponent(modificationId)}`
    : `${ZAKEKE_BASE}/v1/designs/${encodeURIComponent(designId)}/outputfiles/zip`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = res.headers.get("content-type") || "";
  if (res.ok && !contentType.includes("application/json")) {
    return {
      name: `design-${designId}.zip`,
      url,
      side: "production-zip",
      designId,
      orderItemId: null,
    };
  }

  const text = await res.text();
  if (!res.ok) {
    // Zakeke returns 404 "Zip file not ready yet." while the production
    // bundle is still being built. Surface it as `null` so callers can
    // respond with a friendly "try again in a minute" instead of a 500.
    if (res.status === 404 && /not ready/i.test(text)) {
      console.warn(`[zakeke-design-zip] not ready yet for design ${designId}`);
      return null;
    }
    throw new Error(
      `Zakeke design zip failed ${res.status}: ${text.slice(0, 300)}`,
    );
  }

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const zipUrl =
    data?.url ??
    data?.fileUrl ??
    data?.downloadUrl ??
    data?.printingFilesZip ??
    null;
  if (!zipUrl) return null;
  return {
    name: `design-${designId}.zip`,
    url: String(zipUrl),
    side: "production-zip",
    designId,
    orderItemId: null,
  };
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
  customerCode?: string;
  visitorCode?: string | null;
  /** ISO 4217 currency code, e.g. "EUR" */
  currency?: string;
  /** Customer email — required by Zakeke V1 orders endpoint. */
  customerEmail?: string;
  customerName?: string | null;
  /** Order subtotal (sum of item totals before shipping/tax). */
  subtotal?: number;
  shippingCost?: number;
  taxAmount?: number;
  totalAmount?: number;
  /** Optional ISO date string; defaults to now(). */
  orderDate?: string;
  /** Shipping address for the Zakeke order. */
  shippingAddress?: ZakekeShippingAddress | null;
}): Promise<{ zakekeOrderId: string; orderItemIds: string[]; raw: any }> {
  // Zakeke binds designs to the visitor session that created them. We MUST
  // pass the same visitorcode that was used while the customer designed in
  // the browser; otherwise the order won't show up under the design.
  const visitorCode =
    opts.visitorCode || opts.customerCode || opts.externalOrderId;
  const customerCode = opts.customerCode || visitorCode;
  const token = await getZakekeS2SToken({
    customerCode,
    visitorCode,
  });

  const orderDate = opts.orderDate ?? new Date().toISOString();
  const currency = (opts.currency ?? "EUR").toUpperCase();
  const computedSubtotal =
    opts.subtotal ??
    opts.items.reduce(
      (s, it) => s + Number(it.unitPrice ?? 0) * (it.quantity ?? 1),
      0,
    );

  // Per Zakeke's Visual Customizer order-registration docs, /v2/order expects
  // orderCode + sessionID + details[].orderDetailCode/designID/modelUnitPrice/
  // designUnitPrice/quantity. We keep the payload close to the documented
  // shape instead of inferring undocumented fields from the client id.
  const payloadV2 = {
    orderCode: opts.externalOrderId,
    orderDate,
    sessionID: visitorCode,
    total: Number((opts.totalAmount ?? computedSubtotal).toFixed(2)),
    currency,
    details: opts.items.map((it) => ({
      orderDetailCode: it.reference ?? it.designId,
      designID: it.designId,
      sku: it.sku ?? null,
      quantity: it.quantity,
      modelUnitPrice: Number(it.unitPrice ?? 0),
      designUnitPrice: 0,
    })),
  };

  const endpoints: Array<{ url: string; body: unknown }> = [
    { url: `${ZAKEKE_BASE}/v2/order`, body: payloadV2 },
  ];

  let res: Response | null = null;
  let text = "";
  let lastErr = "";
  for (const { url, body } of endpoints) {
    console.log(`[zakeke-create-order] live base=${ZAKEKE_BASE}`);
    console.log(
      `\n========== [zakeke-create-order] DEBUG PAYLOAD ==========\n` +
        `Endpoint : ${url}\n` +
        `VisitorCode : ${visitorCode}\n` +
        `CustomerCode: ${customerCode}\n` +
        `JSON Body   :\n${JSON.stringify(body, null, 2)}\n` +
        `=========================================================\n`,
    );
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    text = await res.text();
    console.log(
      `[zakeke-create-order] response ${res.status} from ${url}:\n${text.slice(0, 2000)}`,
    );
    if (res.ok) break;
    lastErr = `${res.status} @ ${url}: ${text.slice(0, 200)}`;
  }
  if (!res || !res.ok) {
    throw new Error(`Zakeke create order failed — ${lastErr}`);
  }

  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* keep empty */
  }
  console.log(
    `[zakeke-create-order] parsed data keys:`,
    Object.keys(data ?? {}),
  );

  // IMPORTANT: Zakeke V2 returns its own internal order id which is what
  // /v2/orders/{id}/output-files expects. We must NEVER fall back to our
  // externalOrderId — using our UUID against output-files yields HTTP 400.
  let zakekeOrderId =
    data?.id ??
    data?.orderId ??
    data?.orderID ??
    data?.zakekeOrderId ??
    data?.zakekeOrderID ??
    data?.order?.id ??
    data?.order?.orderId ??
    data?.order?.orderID ??
    data?.data?.id ??
    data?.data?.orderId ??
    data?.result?.id ??
    null;
  if (!zakekeOrderId) {
    const resolvedOrder = await resolveZakekeOrderByCode(opts.externalOrderId, token);
    if (resolvedOrder) {
      data = resolvedOrder;
      zakekeOrderId =
        resolvedOrder?.id ??
        resolvedOrder?.orderId ??
        resolvedOrder?.orderID ??
        resolvedOrder?.order?.id ??
        resolvedOrder?.data?.id ??
        null;
    }
  }
  if (!zakekeOrderId) {
    console.error(
      `[zakeke-create-order] Could NOT extract Zakeke order id from response. ` +
        `Top-level keys: ${Object.keys(data ?? {}).join(", ")}. Full body:\n${text.slice(0, 4000)}`,
    );
    throw new Error(
      `Zakeke create order: response missing order id (keys: ${Object.keys(data ?? {}).join(",")})`,
    );
  }
  console.log(`[zakeke-create-order] extracted zakekeOrderId=${zakekeOrderId}`);

  // Pull Zakeke-side order-item ids from whichever shape the API returned.
  const itemsList: any[] =
    data?.orderItems ??
    data?.items ??
    data?.designs ??
    data?.details ??
    data?.compositionDetails ??
    data?.order?.orderItems ??
    [];
  const orderItemIds = itemsList
    .map(
      (it) =>
        it?.orderItemId ??
        it?.orderItemID ??
        it?.id ??
        it?.detailID ??
        it?.detailId ??
        null,
    )
    .filter((x: unknown) => x !== null && x !== undefined)
    .map(String);

  console.log(
    `[zakeke-create-order] extracted orderItemIds=${JSON.stringify(orderItemIds)}`,
  );
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
  orderItemId: string,
): Promise<ZakekeOutputFile[]> {
  const token = await getZakekeS2SToken();
  const url = `${ZAKEKE_BASE}/v1/order-items/${encodeURIComponent(orderItemId)}/files`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Zakeke order-item files failed ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Zakeke order-item files: non-JSON response");
  }

  const list: any[] = Array.isArray(data)
    ? data
    : (data?.files ?? data?.items ?? []);
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
  orderItemIds?: string[],
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

  // Preferred V2 endpoint that returns ALL output files for an order at once.
  // NOTE: zakekeOrderId here MUST be Zakeke's own order id (NOT our UUID).
  const token = await getZakekeS2SToken();
  try {
    const url = `${ZAKEKE_BASE}/v2/orders/${encodeURIComponent(zakekeOrderId)}/output-files`;
    console.log(`[zakeke-output-files] GET ${url}`);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (res.ok) {
      let data: any;
      try { data = JSON.parse(text); } catch { data = null; }
      const list: any[] = Array.isArray(data)
        ? data
        : (data?.files ?? data?.outputFiles ?? data?.items ?? []);
      for (const f of list) {
        const fileUrl = f?.url ?? f?.fileUrl ?? f?.downloadUrl ?? f?.link;
        if (!fileUrl) continue;
        out.push({
          name: f?.name ?? f?.fileName ?? f?.type ?? "print-file",
          url: String(fileUrl),
          side: f?.side ?? f?.sideName ?? f?.type ?? f?.kind ?? null,
          designId: f?.designId ? String(f.designId) : null,
          orderItemId: f?.orderItemId ?? f?.orderItemID ?? null,
        });
      }
      if (out.length > 0) return out;
    } else {
      console.error(`[zakeke-output-files] ${res.status}: ${text.slice(0, 300)}`);
    }
  } catch (e) {
    console.error("[zakeke-output-files] error:", e);
  }

  // Fallback: resolve the order to discover its order-item ids.
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
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      lastError = `${res.status} @ ${url}: ${text.slice(0, 200)}`;
      continue;
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      lastError = `non-JSON @ ${url}`;
      continue;
    }
    const itemsList: any[] =
      data?.orderItems ??
      data?.items ??
      data?.designs ??
      data?.order?.orderItems ??
      [];
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
