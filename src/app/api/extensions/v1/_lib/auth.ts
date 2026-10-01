import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { extractBearerToken, hashToken } from "@/lib/extensions/tokens"
import { isExtensionScope, type ExtensionScope } from "@/lib/extensions/scopes"
import { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from "@/lib/extensions/rate-limit"
import { withCors, handlePreflight } from "@/lib/extensions/cors"
import { extFail } from "@/app/api/extensions/v1/_lib/response"
import type { Extension, ExtensionConnection, User } from "@prisma/client"

export type ExtensionRequestContext = {
  user: User
  extension: Extension
  connection: ExtensionConnection
  scopes: ExtensionScope[]
}

type AuthResult = { ok: true; ctx: ExtensionRequestContext } | { ok: false; response: Response }

/**
 * Authenticates a request to /api/extensions/v1/*: every check the
 * "Chrome Extension → Extension API → Auth/Authz → Business Logic" diagram
 * requires happens here, in one place, so no individual route can forget a
 * step. Nothing here trusts anything the extension claims about itself
 * (user id, permissions, extension id) — everything is re-derived from the
 * token.
 */
export async function authenticateExtensionRequest(req: NextRequest): Promise<AuthResult> {
  const raw = extractBearerToken(req.headers.get("authorization"))
  if (!raw) return { ok: false, response: extFail("UNAUTHORIZED", "Missing Authorization: Bearer <token> header") }

  // Rate-limit auth attempts by client IP, before touching the DB, to slow
  // down credential stuffing against the token endpoint.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const authLimit = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth)
  if (!authLimit.allowed) {
    return { ok: false, response: extFail("RATE_LIMITED", "Too many authentication attempts", { retryAfterSeconds: authLimit.retryAfterSeconds }) }
  }

  const tokenHash = hashToken(raw)
  const token = await db.extensionToken.findUnique({
    where: { tokenHash },
    include: { connection: { include: { extension: true, user: true } } },
  })

  if (!token) return { ok: false, response: extFail("INVALID_TOKEN", "Token not recognized") }
  if (token.revokedAt) return { ok: false, response: extFail("TOKEN_REVOKED", "This token has been revoked") }
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, response: extFail("TOKEN_EXPIRED", "This token has expired — reconnect the extension") }

  const { connection } = token
  const { extension, user } = connection

  if (connection.status !== "active") return { ok: false, response: extFail("CONNECTION_REVOKED", "This connection has been revoked") }
  if (!extension.enabled) return { ok: false, response: extFail("EXTENSION_DISABLED", "This extension has been disabled by an administrator") }

  const scopes = safeJsonParse<string[]>(connection.permissions, []).filter(isExtensionScope)

  // Best-effort activity heartbeat — never block the request on this write.
  void db.extensionToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
  void db.extensionConnection.update({ where: { id: connection.id }, data: { lastActivityAt: new Date() } }).catch(() => {})

  return { ok: true, ctx: { user, extension, connection, scopes } }
}

export function requireScope(ctx: ExtensionRequestContext, scope: ExtensionScope): Response | null {
  if (ctx.scopes.includes(scope)) return null
  return extFail("PERMISSION_DENIED", `This connection is not authorized for "${scope}"`, { requiredScope: scope })
}

/**
 * Records an ExtensionActivity row. Never throws — a logging failure must
 * never fail the underlying business operation. Never pass tokens/secrets
 * in `metadata`.
 */
export async function logExtensionActivity(input: {
  extensionId: string
  connectionId?: string | null
  userId?: string | null
  action: string
  sourceUrl?: string | null
  productId?: string | null
  status: "success" | "error"
  errorCode?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await db.extensionActivity.create({
      data: {
        extensionId: input.extensionId,
        connectionId: input.connectionId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        sourceUrl: input.sourceUrl ?? null,
        productId: input.productId ?? null,
        status: input.status,
        errorCode: input.errorCode ?? null,
        metadata: JSON.stringify(input.metadata ?? {}),
      },
    })
  } catch {
    // best-effort
  }
}

type RouteOptions = { scope?: ExtensionScope; rateLimit?: RateLimitConfig }
type RouteHandler = (req: NextRequest, ctx: ExtensionRequestContext) => Promise<Response>

/**
 * Wraps a v1 route handler with: CORS, auth, scope check, rate limiting,
 * and a catch-all error boundary — so individual route files only contain
 * business logic. Also exports a ready-made OPTIONS handler; re-export it
 * alongside GET/POST/etc.:
 *
 *   export const { GET, OPTIONS } = { GET: extensionRoute({ scope: "products:read" }, handler), OPTIONS: preflight }
 */
export function extensionRoute(options: RouteOptions, handler: RouteHandler) {
  return async function (req: NextRequest): Promise<Response> {
    const auth = await authenticateExtensionRequest(req)
    if (!auth.ok) return withCors(req, auth.response)

    if (options.scope) {
      const denied = requireScope(auth.ctx, options.scope)
      if (denied) {
        void logExtensionActivity({
          extensionId: auth.ctx.extension.id,
          connectionId: auth.ctx.connection.id,
          userId: auth.ctx.user.id,
          action: "auth.permission_denied",
          status: "error",
          errorCode: "PERMISSION_DENIED",
          metadata: { scope: options.scope, path: req.nextUrl.pathname },
        })
        return withCors(req, denied)
      }
    }

    const rl = checkRateLimit(`${auth.ctx.connection.id}`, options.rateLimit ?? RATE_LIMITS.api)
    if (!rl.allowed) {
      return withCors(req, extFail("RATE_LIMITED", "Too many requests — slow down", { retryAfterSeconds: rl.retryAfterSeconds }))
    }

    try {
      const res = await handler(req, auth.ctx)
      return withCors(req, res)
    } catch (err) {
      console.error("[extensions/v1] unhandled route error", err)
      return withCors(req, extFail("INTERNAL_ERROR", "Unexpected server error"))
    }
  }
}

export const preflight = (req: NextRequest) => handlePreflight(req)
