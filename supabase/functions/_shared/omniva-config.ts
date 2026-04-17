// Shared Omniva configuration — sender details for SIA Ervitex
export const OMNIVA_SENDER = {
  company: "SIA Ervitex",
  contact_person: "Ēriks Lācis",
  phone: "+37129395600",
  email: "eriks@ervitex.lv",
  street: "Braslas iela 29",
  city: "Rīga",
  postcode: "LV-1084",
  country: "LV",
};

// Omniva Edge API base URL (production)
// Docs: https://www.omniva.ee/info/parcel-machine-api
export const OMNIVA_API_BASE = "https://edixml.post.ee/epmx/services/messagesService.wsdl";

// Service code for Omniva parcel machine (PA) Latvia
// PA = Pakomāts (parcel machine), QH = Courier
export const OMNIVA_SERVICE_PA = "PA";
export const OMNIVA_SERVICE_COURIER = "QH";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function getOmnivaAuthHeader(): string {
  const username = Deno.env.get("OMNIVA_USERNAME");
  const password = Deno.env.get("OMNIVA_PASSWORD");
  if (!username || !password) {
    throw new Error("OMNIVA_USERNAME or OMNIVA_PASSWORD not configured");
  }
  return "Basic " + btoa(`${username}:${password}`);
}

export function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
