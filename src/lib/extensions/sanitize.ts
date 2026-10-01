/**
 * Strips all markup from extension-supplied text. The project has no HTML
 * sanitizer dependency (no sanitize-html/DOMPurify), and product
 * descriptions are rendered as plain text elsewhere in the storefront, so
 * the safest and simplest rule is: extension-sourced text is stored as
 * plain text, never HTML. Tags, comments, and everything between
 * <script>/<style> tags are removed; entities are decoded for the common
 * cases a scraped page tends to contain.
 *
 * If a future extension needs to submit rich HTML, add a real sanitizer
 * (e.g. `sanitize-html` with a strict tag allowlist) rather than extending
 * this — do not loosen this function.
 */
export function sanitizeExtensionText(input: unknown, maxLength = 20000): string {
  if (typeof input !== "string") return ""
  let text = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length > maxLength) text = text.slice(0, maxLength)
  return text
}

/** Same idea for short single-line fields (title, SKU, tags…) — no whitespace collapsing needed beyond trim. */
export function sanitizeExtensionLine(input: unknown, maxLength = 300): string {
  if (typeof input !== "string") return ""
  const text = input.replace(/<[^>]+>/g, "").replace(/[\r\n\t]+/g, " ").trim()
  return text.length > maxLength ? text.slice(0, maxLength) : text
}
