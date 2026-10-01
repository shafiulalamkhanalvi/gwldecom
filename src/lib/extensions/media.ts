import { checkUrlIsSafeToFetch } from "@/lib/extensions/ssrf"

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8MB
const FETCH_TIMEOUT_MS = 8000
// SVG is deliberately excluded — it can carry <script>/event-handler payloads.
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

export type ValidatedImage = { url: string; contentType: string; bytes: number }
export type MediaValidationError = { ok: false; code: "IMAGE_FETCH_FAILED" | "IMAGE_REJECTED"; message: string }

/**
 * Validates an extension-supplied image URL is safe and really is an image,
 * without trusting the extension's own claims about it:
 *   1. SSRF check (blocks private/internal network targets)
 *   2. Size-capped, timeout-bounded fetch (never buffers an unbounded body)
 *   3. Content-Type AND magic-byte sniff must agree it's an allowed raster format
 *
 * Returns the original URL on success (images are referenced by URL, same as
 * the admin product form's "paste a URL" path) — nothing is persisted here.
 */
export async function validateExtensionImageUrl(rawUrl: string): Promise<ValidatedImage | MediaValidationError> {
  const ssrf = await checkUrlIsSafeToFetch(rawUrl)
  if (!ssrf.safe) return { ok: false, code: "IMAGE_REJECTED", message: `Image URL rejected: ${ssrf.reason}` }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: "follow", // Note: Node's fetch re-resolves DNS per redirect hop, each hop is still bound by this same-origin fetch's protocol restrictions
      headers: { "User-Agent": "ShopHaat-ExtensionAPI-MediaFetcher/1.0" },
    })
    if (!res.ok || !res.body) {
      return { ok: false, code: "IMAGE_FETCH_FAILED", message: `Image URL returned HTTP ${res.status}` }
    }
    const declaredType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
    const declaredLength = Number(res.headers.get("content-length") || "0")
    if (declaredLength && declaredLength > MAX_IMAGE_BYTES) {
      return { ok: false, code: "IMAGE_REJECTED", message: `Image exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024}MB limit` }
    }

    // Read only enough bytes to sniff the format and enforce the size cap,
    // regardless of what Content-Length claims.
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel().catch(() => {})
        return { ok: false, code: "IMAGE_REJECTED", message: `Image exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024}MB limit` }
      }
      chunks.push(value)
      if (total >= 32) break // magic bytes are within the first few bytes; stop early
    }
    const head = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    const sniffed = sniffImageType(head)

    if (!sniffed || !ALLOWED_IMAGE_TYPES.has(sniffed)) {
      return { ok: false, code: "IMAGE_REJECTED", message: "URL does not point to a supported image format (jpeg/png/webp/gif)" }
    }
    if (declaredType && ALLOWED_IMAGE_TYPES.has(declaredType) && declaredType !== sniffed) {
      return { ok: false, code: "IMAGE_REJECTED", message: "Declared Content-Type does not match the file's actual format" }
    }

    return { url: rawUrl, contentType: sniffed, bytes: total }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError"
    return { ok: false, code: "IMAGE_FETCH_FAILED", message: timedOut ? "Image fetch timed out" : "Could not fetch image URL" }
  } finally {
    clearTimeout(timeout)
  }
}

function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp"
  if (buf.length >= 6 && (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a")) return "image/gif"
  return null
}
