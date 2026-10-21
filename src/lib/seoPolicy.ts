export const SEO_ORIGIN = "https://t-bode.lv";

/** Public canonicals never contain tracking, filters or personalized state. */
export const buildCanonical = (path: string): string => {
  try {
    const url = new URL(path, SEO_ORIGIN);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${SEO_ORIGIN}${pathname}`;
  } catch {
    return `${SEO_ORIGIN}/`;
  }
};

/** Index the public design entry, not account pages or draft previews. */
export const shouldNoindex = (pathname: string, search: string): boolean => {
  const privateRoutes = ["/cart", "/checkout", "/admin", "/auth", "/profile", "/payment-success", "/reset-password", "/install"];
  return privateRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    || new URLSearchParams(search).get("preview") === "1";
};
/** Only the production domains may be indexed; previews and staging hosts stay noindex. */
export const isIndexableHost = (hostname: string): boolean =>
  ["t-bode.lv", "www.t-bode.lv"].includes(hostname.toLowerCase());
