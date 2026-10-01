import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { syncExtensionRegistry } from "@/lib/extensions/registry"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ExtensionsManager } from "@/components/admin/extensions-manager"

export const dynamic = "force-dynamic"

export default async function AdminExtensionsPage() {
  await syncExtensionRegistry()

  const extensions = await db.extension.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { connections: { where: { status: "active" } } } } },
  })

  const items = extensions.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    version: e.version,
    developer: e.developer,
    apiVersion: e.apiVersion,
    permissions: safeJsonParse<string[]>(e.permissions, []),
    enabled: e.enabled,
    activeConnections: e._count.connections,
  }))

  return (
    <div>
      <AdminPageHeader
        title="Extensions"
        description="Chrome extensions and external tools connected to your store through the Extension API."
      />
      <ExtensionsManager extensions={items} />
    </div>
  )
}
