import { validateExtensionImageUrl } from "@/lib/extensions/media"
import { extensionRoute, preflight } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"
import { RATE_LIMITS } from "@/lib/extensions/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/extensions/v1/media/validate { url } — requires media:write.
// Useful for extensions (e.g. a future Image Importer) that want to check
// an image is safe/fetchable before including it in a product payload.
export const POST = extensionRoute({ scope: "media:write", rateLimit: RATE_LIMITS.media }, async (req) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return extFail("INVALID_PAYLOAD", "Request body must be valid JSON")
  }
  const url = (body as Record<string, unknown>)?.url
  if (typeof url !== "string" || !url) return extFail("VALIDATION_ERROR", "`url` is required")

  const result = await validateExtensionImageUrl(url)
  if ("ok" in result && result.ok === false) return extFail(result.code, result.message)

  return extOk({ valid: true, url: result.url, contentType: result.contentType, bytes: result.bytes })
})

export const OPTIONS = preflight
