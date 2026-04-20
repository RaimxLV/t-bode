const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2025-08-27.basil";

type StripePrimitive = string | number | boolean | null | undefined;
type StripeValue = StripePrimitive | StripeValue[] | { [key: string]: StripeValue };

function getStripeSecretKey() {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }

  return secretKey;
}

function appendFormValue(params: URLSearchParams, key: string, value: StripeValue) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormValue(params, `${key}[${index}]`, item));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([nestedKey, nestedValue]) => {
      appendFormValue(params, `${key}[${nestedKey}]`, nestedValue);
    });
    return;
  }

  params.append(key, String(value));
}

function buildFormBody(body: Record<string, StripeValue>) {
  const params = new URLSearchParams();

  Object.entries(body).forEach(([key, value]) => {
    appendFormValue(params, key, value);
  });

  return params;
}

async function stripeRequest<T>(path: string, init?: {
  method?: "GET" | "POST";
  body?: Record<string, StripeValue>;
  query?: Record<string, string | number | boolean | undefined>;
}) {
  const secretKey = getStripeSecretKey();
  const method = init?.method ?? "POST";
  const url = new URL(`${STRIPE_API_BASE}/${path}`);

  if (init?.query) {
    Object.entries(init.query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" && init?.body ? buildFormBody(init.body).toString() : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Stripe request failed (${response.status})`);
  }

  return data as T;
}

function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

async function createHmacSha256(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function constructStripeEvent<T = unknown>(
  body: string,
  signatureHeader: string,
  webhookSecret: string,
) {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid signature header");
  }

  const timestampAge = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(timestampAge) || timestampAge > 300) {
    throw new Error("Signature timestamp outside tolerance");
  }

  const expectedSignature = await createHmacSha256(webhookSecret, `${timestamp}.${body}`);
  const isValid = signatures.some((signature) => secureCompare(signature, expectedSignature));

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  return JSON.parse(body) as T;
}

export function createStripeClient() {
  return {
    customers: {
      list: (params: { email: string; limit: number }) =>
        stripeRequest<{ data: Array<{ id: string }> }>("customers", {
          method: "GET",
          query: params,
        }),
      create: (body: Record<string, StripeValue>) => stripeRequest<{ id: string }>("customers", { body }),
    },
    invoiceItems: {
      create: (body: Record<string, StripeValue>) => stripeRequest<{ id: string }>("invoiceitems", { body }),
    },
    invoices: {
      create: (body: Record<string, StripeValue>) =>
        stripeRequest<{ id: string; invoice_pdf?: string | null; hosted_invoice_url?: string | null }>("invoices", { body }),
      finalizeInvoice: (invoiceId: string) =>
        stripeRequest<{ id: string; invoice_pdf?: string | null; hosted_invoice_url?: string | null }>(`invoices/${invoiceId}/finalize`),
      sendInvoice: (invoiceId: string) => stripeRequest(`invoices/${invoiceId}/send`),
      retrieve: (invoiceId: string) =>
        stripeRequest<{ id: string; invoice_pdf?: string | null }>(`invoices/${invoiceId}`, { method: "GET" }),
    },
    checkout: {
      sessions: {
        create: (body: Record<string, StripeValue>) =>
          stripeRequest<{ id: string; url: string | null }>("checkout/sessions", { body }),
      },
    },
  };
}