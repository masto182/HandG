/**
 * Pure text sanitisers used by request validators and search inputs.
 *
 * - `stripHtml` removes any `<...>` tags and decodes a small whitelist of
 *   common HTML entities. It is NOT a full HTML parser; for trusted server-
 *   to-server payloads we prefer this lightweight approach to avoid an extra
 *   dependency surface.
 * - `safeText` is the canonical normaliser for free-text user input: NFKC
 *   unicode normalise → strip tags → trim → collapse whitespace → length cap.
 */

const TAG_RE = /<[^>]*>/g
const SCRIPT_OR_STYLE_RE = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
}

export function stripHtml(input: string): string {
  if (!input) return ""
  // Remove script/style blocks INCLUDING their inner contents (otherwise
  // the inner JS payload would leak through as plain text).
  const noScript = input.replace(SCRIPT_OR_STYLE_RE, "")
  const noTags = noScript.replace(TAG_RE, "")
  return noTags.replace(
    /&(?:amp|lt|gt|quot|apos|#39|#x27);/g,
    (m) => ENTITY_MAP[m] ?? m
  )
}

export function safeText(input: unknown, max: number): string {
  if (input == null) return ""
  const str = String(input).normalize("NFKC")
  const stripped = stripHtml(str)
  const collapsed = stripped.replace(/\s+/g, " ").trim()
  return collapsed.slice(0, Math.max(0, max))
}
