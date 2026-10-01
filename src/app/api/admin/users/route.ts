import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok } from "@/app/api/admin/_lib/session"

export const dynamic = "force-dynamic"

const ROLES = ["admin", "staff", "customer"]

// GET /api/admin/users
export async function GET(req: NextRequest) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20))
  const search = sp.get("search")?.trim() ?? ""
  const role = sp.get("role") ?? ""

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { fullName: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (role && ROLES.includes(role)) where.role = role

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true } },
      },
    }),
  ])

  return ok({ items: users, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) })
}
