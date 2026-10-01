import { extensionRoute, preflight } from "@/app/api/extensions/v1/_lib/auth"
import { extOk } from "@/app/api/extensions/v1/_lib/response"
import { EXTENSION_SCOPES } from "@/lib/extensions/scopes"
import { RATE_LIMITS } from "@/lib/extensions/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/extensions/v1/capabilities
 * Returns the API version, this connection's granted scopes, and the rate
 * limits in effect — so an extension can self-configure and show the user
 * an accurate "connected as ... with permissions ..." state without the
 * developer having to hardcode any of this.
 */
export const GET = extensionRoute({}, async (_req, ctx) => {
  return extOk({
    apiVersion: "v1",
    extension: { id: ctx.extension.id, name: ctx.extension.name, version: ctx.extension.version },
    user: { id: ctx.user.id, name: ctx.user.fullName, role: ctx.user.role },
    grantedScopes: ctx.scopes,
    allScopes: EXTENSION_SCOPES,
    rateLimits: {
      general: RATE_LIMITS.api,
      imports: RATE_LIMITS.imports,
      media: RATE_LIMITS.media,
    },
  })
})

export const OPTIONS = preflight
