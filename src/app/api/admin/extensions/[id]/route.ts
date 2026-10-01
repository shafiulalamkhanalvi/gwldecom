import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/admin/extensions/[id] — connections (who, permissions, last activity, status) + recent activity/errors.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const { id } = await params
  const extension = await db.extension.findUnique({
    where: { id },
    include: {
      connections: {
        orderBy: { connectedAt: "desc" },
        include: { user: { select: { id: true, fullName: true, email: true } }, tokens: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  })
  if (!extension) return fail("Extension not found", 404)

  const activity = await db.extensionActivity.findMany({
    where: { extensionId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return ok({
    extension: {
      id: extension.id,
      name: extension.name,
      description: extension.description,
      version: extension.version,
      developer: extension.developer,
      apiVersion: extension.apiVersion,
      permissions: safeJsonParse<string[]>(extension.permissions, []),
      allowedOrigins: safeJsonParse<string[]>(extension.allowedOrigins, []),
      enabled: extension.enabled,
    },
    connections: extension.connections.map((c) => ({
      id: c.id,
      user: c.user,
      permissions: safeJsonParse<string[]>(c.permissions, []),
      status: c.status,
      connectedAt: c.connectedAt,
      revokedAt: c.revokedAt,
      lastActivityAt: c.lastActivityAt,
      latestToken: c.tokens[0] ? { prefix: c.tokens[0].tokenPrefix, expiresAt: c.tokens[0].expiresAt, lastUsedAt: c.tokens[0].lastUsedAt, revoked: !!c.tokens[0].revokedAt } : null,
    })),
    activity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      status: a.status,
      errorCode: a.errorCode,
      sourceUrl: a.sourceUrl,
      productId: a.productId,
      createdAt: a.createdAt,
    })),
  })
}

// PATCH /api/admin/extensions/[id] { enabled } — global admin kill switch; instantly rejects every connection's tokens.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  let body: { enabled?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail("Invalid JSON body")
  }
  if (typeof body.enabled !== "boolean") return fail("`enabled` must be a boolean")

  const existing = await db.extension.findUnique({ where: { id } })
  if (!existing) return fail("Extension not found", 404)

  const extension = await db.extension.update({ where: { id }, data: { enabled: body.enabled } })

  await audit({
    actorId: user.id,
    action: body.enabled ? "extension.enable" : "extension.disable",
    entityType: "Extension",
    entityId: id,
    metadata: { name: extension.name },
  })

  return ok({ id: extension.id, enabled: extension.enabled })
}
