import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { requireAdminOrStaff } from "@/lib/session"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ExtensionDetail } from "@/components/admin/extension-detail"

export const dynamic = "force-dynamic"

export default async function AdminExtensionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await requireAdminOrStaff()

  const extension = await db.extension.findUnique({
    where: { id },
    include: {
      connections: {
        orderBy: { connectedAt: "desc" },
        include: { user: { select: { id: true, fullName: true, email: true } }, tokens: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  })
  if (!extension) notFound()

  const activity = await db.extensionActivity.findMany({
    where: { extensionId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const myConnection = extension.connections.find((c) => c.userId === currentUser?.id && c.status === "active")

  return (
    <div>
      <AdminPageHeader title={extension.name} description={extension.description} />
      <ExtensionDetail
        extension={{
          id: extension.id,
          name: extension.name,
          version: extension.version,
          developer: extension.developer,
          apiVersion: extension.apiVersion,
          permissions: safeJsonParse<string[]>(extension.permissions, []),
          allowedOrigins: safeJsonParse<string[]>(extension.allowedOrigins, []),
          enabled: extension.enabled,
        }}
        myConnectionId={myConnection?.id ?? null}
        connections={extension.connections.map((c) => ({
          id: c.id,
          user: c.user,
          permissions: safeJsonParse<string[]>(c.permissions, []),
          status: c.status,
          connectedAt: c.connectedAt.toISOString(),
          lastActivityAt: c.lastActivityAt ? c.lastActivityAt.toISOString() : null,
          tokenPrefix: c.tokens[0]?.tokenPrefix ?? null,
          tokenExpiresAt: c.tokens[0]?.expiresAt ? c.tokens[0].expiresAt.toISOString() : null,
        }))}
        activity={activity.map((a) => ({
          id: a.id,
          action: a.action,
          status: a.status,
          errorCode: a.errorCode,
          sourceUrl: a.sourceUrl,
          productId: a.productId,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
