import { db } from "@/lib/db"
import { formatDateTime, cn, safeJsonParse } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { AuditFilters } from "@/components/admin/audit-filters"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollText } from "lucide-react"

export const dynamic = "force-dynamic"

const actionStyle: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-sky-100 text-sky-800",
  delete: "bg-rose-100 text-rose-800",
  archive: "bg-amber-100 text-amber-800",
  role_change: "bg-violet-100 text-violet-800",
}

function actionLabel(action: string) {
  const verb = action.split(".").pop() ?? action
  return verb.replace(/_/g, " ")
}

function actionVerb(action: string) {
  return (action.split(".").pop() ?? action).replace(/_/g, " ")
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(asString(sp.page) ?? "1", 10) || 1)
  const limit = 30
  const search = asString(sp.search)?.trim() ?? ""
  const entityType = asString(sp.entityType) ?? ""

  const where: Record<string, unknown> = {}
  if (entityType) where.entityType = entityType
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { entityType: { contains: search } },
      { entityId: { contains: search } },
    ]
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { fullName: true, email: true } } },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (entityType) params.set("entityType", entityType)
    params.set("page", String(p))
    return `/admin/audit?${params.toString()}`
  }

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        description="A read-only history of every administrative action."
      />
      <Card>
        <CardContent className="gap-4">
          <AuditFilters />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="pr-6">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ScrollText className="size-6" />
                        No audit entries yet.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => {
                    const meta = safeJsonParse<Record<string, unknown>>(l.metadata, {})
                    const verb = actionVerb(l.action)
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6 text-xs text-muted-foreground">
                          {formatDateTime(l.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{l.actor?.fullName ?? "System"}</span>
                            <span className="text-xs text-muted-foreground">{l.actor?.email ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", actionStyle[verb] ?? "bg-muted text-muted-foreground")}>
                            {actionLabel(l.action)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{l.entityType}</span>
                            {l.entityId ? (
                              <span className="font-mono text-xs text-muted-foreground">{l.entityId.slice(-8)}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6">
                          <pre className="max-w-[360px] overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground scroll-thin">
                            {JSON.stringify(meta, null, 0)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </CardContent>
      </Card>
    </div>
  )
}

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}
