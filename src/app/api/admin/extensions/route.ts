import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { guardAdmin, ok } from "@/app/api/admin/_lib/session"
import { syncExtensionRegistry } from "@/lib/extensions/registry"

export const dynamic = "force-dynamic"

// GET /api/admin/extensions — every registered extension plus connection counts.
export async function GET() {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  await syncExtensionRegistry()

  const extensions = await db.extension.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { connections: { where: { status: "active" } } } } },
  })

  return ok({
    items: extensions.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      version: e.version,
      developer: e.developer,
      apiVersion: e.apiVersion,
      permissions: safeJsonParse<string[]>(e.permissions, []),
      allowedOrigins: safeJsonParse<string[]>(e.allowedOrigins, []),
      enabled: e.enabled,
      activeConnections: e._count.connections,
      createdAt: e.createdAt,
    })),
  })
}
