import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
const VALID_PAYMENT = ["unpaid", "paid", "refunded"]

// GET /api/admin/orders/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, title: true, slug: true, sku: true, images: { select: { url: true }, take: 1, orderBy: { position: "asc" } } } },
        },
      },
    },
  })
  if (!order) return fail("Order not found", 404)

  return ok({
    ...order,
    total: Number(order.total),
    items: order.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      product: i.product,
    })),
    shippingAddress: JSON.parse(order.shippingAddress || "{}"),
  })
}

// PUT /api/admin/orders/[id] — update status & payment status
export async function PUT(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.order.findUnique({ where: { id }, select: { id: true, status: true, paymentStatus: true } })
  if (!existing) return fail("Order not found", 404)

  let body: any
  try {
    body = await req.json()
  } catch {
    return fail("Invalid JSON body")
  }

  const updates: { status?: string; paymentStatus?: string } = {}
  if (body?.status !== undefined) {
    const status = String(body.status)
    if (!VALID_STATUSES.includes(status)) return fail("Invalid status")
    updates.status = status
  }
  if (body?.paymentStatus !== undefined) {
    const paymentStatus = String(body.paymentStatus)
    if (!VALID_PAYMENT.includes(paymentStatus)) return fail("Invalid payment status")
    updates.paymentStatus = paymentStatus
  }

  if (Object.keys(updates).length === 0) return fail("Nothing to update")

  const updated = await db.order.update({ where: { id }, data: updates })

  await audit({
    actorId: user.id,
    action: "order.update",
    entityType: "Order",
    entityId: id,
    metadata: { before: { status: existing.status, paymentStatus: existing.paymentStatus }, after: updates },
  })

  return ok({ id: updated.id, status: updated.status, paymentStatus: updated.paymentStatus })
}
