import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok } from "@/app/api/admin/_lib/session"

export const dynamic = "force-dynamic"

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

// GET /api/admin/orders
export async function GET(req: NextRequest) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20))
  const status = sp.get("status") ?? ""
  const paymentStatus = sp.get("paymentStatus") ?? ""
  const search = sp.get("search")?.trim() ?? ""

  const where: Record<string, unknown> = {}
  if (status && VALID_STATUSES.includes(status)) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { customer: { email: { contains: search } } },
      { customer: { fullName: { contains: search } } },
    ]
  }

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        items: { select: { id: true, quantity: true, unitPrice: true } },
      },
    }),
  ])

  const items = orders.map((o) => ({
    ...o,
    total: Number(o.total),
    items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) })),
  }))

  return ok({ items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) })
}
