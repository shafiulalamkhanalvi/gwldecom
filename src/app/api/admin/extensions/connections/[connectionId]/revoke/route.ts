import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ connectionId: string }> }

// POST /api/admin/extensions/connections/[connectionId]/revoke
// Revokes the connection AND every token under it — immediate, irreversible
// (reconnecting issues a brand new connection/token). This is the
// "[Disconnect] / [Revoke Access]" action from Settings → Extensions.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { connectionId } = await params
  const connection = await db.extensionConnection.findUnique({ where: { id: connectionId } })
  if (!connection) return fail("Connection not found", 404)

  await db.$transaction([
    db.extensionConnection.update({ where: { id: connectionId }, data: { status: "revoked", revokedAt: new Date() } }),
    db.extensionToken.updateMany({ where: { connectionId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])

  await audit({
    actorId: user.id,
    action: "extension.revoke",
    entityType: "ExtensionConnection",
    entityId: connectionId,
    metadata: { extensionId: connection.extensionId, userId: connection.userId },
  })

  return ok({ connectionId, status: "revoked" })
}
