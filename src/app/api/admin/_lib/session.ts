import { NextResponse } from "next/server"
import { requireAdminOrStaff } from "@/lib/session"

/**
 * Returns the authenticated admin/staff user, or a 401/403 NextResponse.
 * Usage:
 *   const guard = await guardAdmin()
 *   if (guard instanceof NextResponse) return guard
 *   const user = guard
 */
export async function guardAdmin() {
  const user = await requireAdminOrStaff()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  return user
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
