import DOMPurify from "dompurify";

/**
 * Sanitize admin/AI-generated HTML before rendering with dangerouslySetInnerHTML.
 * Allows the rich-text tags TipTap produces and safe link attributes only.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "strong", "em", "u", "s", "blockquote", "code", "pre",
      "a", "img",
      "span", "div",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
    ALLOW_DATA_ATTR: false,
  });
}