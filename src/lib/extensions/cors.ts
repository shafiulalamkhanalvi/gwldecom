import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"

/**
 * CORS for /api/extensions/v1/*: never `Access-Control-Allow-Origin: *`.
 * Every enabled Extension row carries an `allowedOrigins` allowlist (set in
 * the registry manifest — typically `chrome-extension://<extension-id>`).
 * A request's Origin header is only echoed back — with credentials still
 * disabled, since auth is a Bearer token, not cookies — if it matches an
 * enabled extension's allowlist. Unknown origins get no CORS headers at all,
 * which browsers treat as a same-origin-only response (i.e. blocked).
 *
 * Preflight (OPTIONS) requests carry no Authorization header, so we can't
 * know *which* extension is calling yet — we just check the Origin against
 * every enabled extension's allowlist. The actual request is still fully
 * authenticated/authorized afterward by _lib/auth.ts.
 */

let cache: { origins: Set<string>; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000

async function getAllowedOriginSet(): Promise<Set<string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.origins
  const extensions = await db.extension.findMany({ where: { enabled: true }, select: { allowedOrigins: true } })
  const origins = new Set<string>()
  for (const ext of extensions) {
    for (const origin of safeJsonParse<string[]>(ext.allowedOrigins, [])) origins.add(origin)
  }
  cache = { origins, expiresAt: Date.now() + CACHE_TTL_MS }
  return origins
}

export async function corsHeadersFor(origin: string | null): Promise<HeadersInit | null> {
  if (!origin) return null
  const allowed = await getAllowedOriginSet()
  if (!allowed.has(origin)) return null
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  }
}

/** Call from an OPTIONS handler exported by any extensions/v1 route. */
export async function handlePreflight(req: Request): Promise<Response> {
  const headers = await corsHeadersFor(req.headers.get("origin"))
  if (!headers) return new Response(null, { status: 403 })
  return new Response(null, { status: 204, headers })
}

/** Wraps an already-built Response, adding CORS headers if the origin is allowlisted. */
export async function withCors(req: Request, res: Response): Promise<Response> {
  const headers = await corsHeadersFor(req.headers.get("origin"))
  if (!headers) return res
  const merged = new Headers(res.headers)
  for (const [k, v] of Object.entries(headers)) merged.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged })
}
