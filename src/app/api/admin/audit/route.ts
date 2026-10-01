import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok } from "@/app/api/admin/_lib/session"

export const dynamic = "force-dynamic"

// GET /api/admin/audit
export async function GET(req: NextRequest) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "30", 10) || 30))
  const action = sp.get("action")?.trim() ?? ""
  const entityType = sp.get("entityType")?.trim() ?? ""
  const search = sp.get("search")?.trim() ?? ""

  const where: Record<string, unknown> = {}
  if (action) where.action = { contains: action }
  if (entityType) where.entityType = entityType
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { entityType: { contains: search } },
      { entityId: { contains: search } },
    ]
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { fullName: true, email: true } } },
    }),
  ])

  const items = logs.map((l) => ({
    ...l,
    metadata: JSON.parse(l.metadata || "{}"),
  }))

  return ok({ items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) })
}
