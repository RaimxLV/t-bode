export type TocItem = { id: string; text: string; level: 2 | 3 };

const slugifyHeading = (text: string, index: number) => {
  const base = text
    .toLowerCase()
    .replace(/[āàáä]/g, "a").replace(/[ēèé]/g, "e").replace(/[īìí]/g, "i")
    .replace(/[ōòó]/g, "o").replace(/[ūùú]/g, "u").replace(/č/g, "c")
    .replace(/ģ/g, "g").replace(/ķ/g, "k").replace(/ļ/g, "l")
    .replace(/ņ/g, "n").replace(/š/g, "s").replace(/ž/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base ? `${base}-${index}` : `sadala-${index}`;
};

/** Reading time in minutes from HTML content (LV average ~200 wpm). */
export const readingMinutes = (html: string | null | undefined) => {
  if (!html) return 1;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 200));
};

/**
 * Adds stable ids to h2/h3 headings so the table of contents can link to them.
 * Returns the rewritten HTML plus the extracted outline.
 */
export const withHeadingAnchors = (html: string | null | undefined): { html: string; toc: TocItem[] } => {
  if (!html) return { html: "", toc: [] };
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { html, toc: [] };
  }
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return { html, toc: [] };

  const toc: TocItem[] = [];
  root.querySelectorAll("h2, h3").forEach((el, i) => {
    const text = (el.textContent || "").trim();
    if (!text) return;
    const id = el.id || slugifyHeading(text, i);
    el.id = id;
    toc.push({ id, text, level: el.tagName === "H2" ? 2 : 3 });
  });

  return { html: root.innerHTML, toc };
};
