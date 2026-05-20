const DEFAULT_FROM_EMAIL = "T-Bode <info@t-bode.lv>";

const SIMPLE_EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAMED_EMAIL_REGEX = /^[^<>\r\n]+<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>$/;

export function getResendFromEmail() {
  const raw = Deno.env.get("RESEND_FROM_EMAIL")?.trim();

  if (!raw) {
    return DEFAULT_FROM_EMAIL;
  }

  const normalized = raw.replace(/\s+/g, " ").trim();

  if (SIMPLE_EMAIL_REGEX.test(normalized) || NAMED_EMAIL_REGEX.test(normalized)) {
    return normalized;
  }

  console.warn("Invalid RESEND_FROM_EMAIL format, falling back to default sender", { raw });
  return DEFAULT_FROM_EMAIL;
}