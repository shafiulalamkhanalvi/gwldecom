import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"
import { generateRawToken, hashToken, tokenPrefixForDisplay, tokenExpiryDate } from "@/lib/extensions/tokens"
import { isExtensionScope } from "@/lib/extensions/scopes"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/extensions/[id]/connect
 * Body (optional): { permissions?: string[] } — a subset of the extension's
 * declared permissions to grant; omit to grant everything the extension
 * declares (all-or-nothing consent, matching a typical Chrome extension
 * install prompt).
 *
 * Creates (or reuses, if already connected) an ExtensionConnection for the
 * current admin user and issues a fresh bearer token. The raw token is
 * returned ONLY in this response — it is never retrievable again, only
 * rotated. This is the "User → Connect Extension → Authorization → Access
 * Token" step of the architecture diagram, done in-app since the extension
 * itself has no server to redirect back to.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const extension = await db.extension.findUnique({ where: { id } })
  if (!extension) return fail("Extension not found", 404)
  if (!extension.enabled) return fail("This extension is disabled and cannot be connected", 403)

  let body: { permissions?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine — defaults to full permission set
  }

  const declared = safeJsonParse<string[]>(extension.permissions, [])
  let grantedPermissions = declared
  if (Array.isArray(body.permissions)) {
    const requested = body.permissions.filter(isExtensionScope)
    const invalid = requested.filter((p) => !declared.includes(p))
    if (invalid.length) return fail(`This extension does not declare permission(s): ${invalid.join(", ")}`)
    grantedPermissions = requested
  }

  const connection = await db.extensionConnection.upsert({
    where: { extensionId_userId: { extensionId: id, userId: user.id } },
    create: { extensionId: id, userId: user.id, permissions: JSON.stringify(grantedPermissions), status: "active" },
    update: { permissions: JSON.stringify(grantedPermissions), status: "active", revokedAt: null },
  })

  const rawToken = generateRawToken()
  const token = await db.extensionToken.create({
    data: {
      connectionId: connection.id,
      tokenHash: hashToken(rawToken),
      tokenPrefix: tokenPrefixForDisplay(rawToken),
      expiresAt: tokenExpiryDate(),
    },
  })

  await audit({
    actorId: user.id,
    action: "extension.connect",
    entityType: "ExtensionConnection",
    entityId: connection.id,
    metadata: { extensionId: id, permissions: grantedPermissions },
  })

  return ok(
    {
      connectionId: connection.id,
      token: rawToken, // shown once — the UI must warn the admin to copy it now
      tokenPrefix: token.tokenPrefix,
      expiresAt: token.expiresAt,
      permissions: grantedPermissions,
    },
    201
  )
}
