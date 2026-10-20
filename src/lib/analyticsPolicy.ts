import { shouldNoindex } from "./seoPolicy";

/** Only pathname is measured. Never transmit query/hash or private route titles. */
export function publicAnalyticsPath(pathname: string, search = ""): string | null {
  if (shouldNoindex(pathname, search)) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  const staticPaths = ["/", "/design", "/collection", "/idejas", "/veikali", "/kas-ir-dtf", "/auduma-maisinu-apdruka", "/privacy", "/terms", "/privacy-policy", "/privatuma-politika", "/terms-and-conditions", "/noteikumi"];
  if (staticPaths.includes(path)) return path;
  return /^\/(produkti|idejas)\/[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)?$/u.test(path) ? path : null;
}

/** Cross-origin referral attribution retains origin only, never personal URL state. */
export function safeAnalyticsReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    return ["https:", "http:"].includes(url.protocol) ? url.origin : "";
  } catch {
    return "";
  }
}