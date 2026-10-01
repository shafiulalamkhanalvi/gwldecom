import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/admin/reviews/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.review.findUnique({
    where: { id },
    select: { id: true, rating: true, title: true, productId: true },
  })
  if (!existing) return fail("Review not found", 404)

  await db.review.delete({ where: { id } })
  await audit({
    actorId: user.id,
    action: "review.delete",
    entityType: "Review",
    entityId: id,
    metadata: { rating: existing.rating, title: existing.title, productId: existing.productId },
  })

  return ok({ deleted: true })
}
