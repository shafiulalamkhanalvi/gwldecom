import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"
import { generateRawToken, hashToken, tokenPrefixForDisplay, tokenExpiryDate } from "@/lib/extensions/tokens"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ connectionId: string }> }

// POST /api/admin/extensions/connections/[connectionId]/rotate
// Issues a new token and immediately revokes the connection's previous
// token(s) — for a suspected-leaked token, or routine rotation. The old
// token stops working the instant this returns; there is no overlap window.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { connectionId } = await params
  const connection = await db.extensionConnection.findUnique({ where: { id: connectionId } })
  if (!connection) return fail("Connection not found", 404)
  if (connection.status !== "active") return fail("Cannot rotate a revoked connection — reconnect instead", 409)

  const previous = await db.extensionToken.findFirst({ where: { connectionId, revokedAt: null }, orderBy: { createdAt: "desc" } })

  const rawToken = generateRawToken()
  const [, token] = await db.$transaction([
    db.extensionToken.updateMany({ where: { connectionId, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.extensionToken.create({
      data: {
        connectionId,
        tokenHash: hashToken(rawToken),
        tokenPrefix: tokenPrefixForDisplay(rawToken),
        expiresAt: tokenExpiryDate(),
        rotatedFromId: previous?.id ?? null,
      },
    }),
  ])

  await audit({
    actorId: user.id,
    action: "extension.rotate_token",
    entityType: "ExtensionConnection",
    entityId: connectionId,
    metadata: { extensionId: connection.extensionId },
  })

  return ok({ connectionId, token: rawToken, tokenPrefix: token.tokenPrefix, expiresAt: token.expiresAt })
}
