// Shared Montonio helpers (JWT signing/verification, base URLs)
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export const MONTONIO_ENV = (Deno.env.get("MONTONIO_ENV") ?? "sandbox").toLowerCase();

export const MONTONIO_PAYMENTS_BASE =
  MONTONIO_ENV === "production"
    ? "https://stargate.montonio.com"
    : "https://sandbox-stargate.montonio.com";

// Shipping V2 lives on a separate host
export const MONTONIO_SHIPPING_BASE =
  MONTONIO_ENV === "production"
    ? "https://shipping.montonio.com"
    : "https://sandbox-shipping.montonio.com";

function getSecretKey(): CryptoKey | Promise<CryptoKey> {
  const secret = Deno.env.get("MONTONIO_SECRET_KEY");
  if (!secret) throw new Error("MONTONIO_SECRET_KEY is not configured");
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    enc,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function getAccessKey(): string {
  const key = Deno.env.get("MONTONIO_ACCESS_KEY");
  if (!key) throw new Error("MONTONIO_ACCESS_KEY is not configured");
  return key;
}

export async function signMontonioJwt(payload: Record<string, unknown>, expSeconds = 600): Promise<string> {
  const key = await getSecretKey();
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      ...payload,
      accessKey: getAccessKey(),
      iat: getNumericDate(0),
      exp: getNumericDate(expSeconds),
    },
    key
  );
}

export async function verifyMontonioJwt<T = Record<string, unknown>>(token: string): Promise<T> {
  const key = await getSecretKey();
  return (await verify(token, key)) as T;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};