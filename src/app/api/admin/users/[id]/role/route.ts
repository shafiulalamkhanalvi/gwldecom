import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const ROLES = ["admin", "staff", "customer"]

// PUT /api/admin/users/[id]/role
export async function PUT(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return fail("Invalid JSON body")
  }

  const role = String(body?.role ?? "")
  if (!ROLES.includes(role)) return fail("Invalid role")

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } })
  if (!target) return fail("User not found", 404)

  // Prevent an admin from demoting themselves (lock-out protection)
  if (target.id === user.id && role !== "admin") {
    return fail("You cannot change your own role.", 422)
  }

  const updated = await db.user.update({ where: { id }, data: { role } })

  await audit({
    actorId: user.id,
    action: "user.role_change",
    entityType: "User",
    entityId: id,
    metadata: { from: target.role, to: role, targetEmail: target.email },
  })

  return ok({ id: updated.id, role: updated.role })
}
