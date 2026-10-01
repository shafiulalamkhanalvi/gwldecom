import Link from "next/link"
import { db } from "@/lib/db"
import { formatBDT, formatDateTime, cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { OrdersFilters } from "@/components/admin/orders-filters"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
}

const paymentStyle: Record<string, string> = {
  unpaid: "bg-rose-100 text-rose-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-zinc-200 text-zinc-700",
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(asString(sp.page) ?? "1", 10) || 1)
  const limit = 15
  const status = asString(sp.status) ?? ""
  const paymentStatus = asString(sp.paymentStatus) ?? ""
  const search = asString(sp.search)?.trim() ?? ""

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { customer: { email: { contains: search } } },
      { customer: { fullName: { contains: search } } },
    ]
  }

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { fullName: true, email: true } },
        items: { select: { quantity: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (paymentStatus) params.set("paymentStatus", paymentStatus)
    if (search) params.set("search", search)
    params.set("page", String(p))
    return `/admin/orders?${params.toString()}`
  }

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"} found.`}
      />
      <Card>
        <CardContent className="gap-4">
          <OrdersFilters />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => {
                    const itemCount = o.items.reduce((n, i) => n + i.quantity, 0)
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="pl-4">
                          <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                            #{o.id.slice(-6).toUpperCase()}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          <div className="flex flex-col">
                            <span className="truncate text-sm font-medium">{o.customer?.fullName ?? "—"}</span>
                            <span className="truncate text-xs text-muted-foreground">{o.customer?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{itemCount}</TableCell>
                        <TableCell className="text-right font-medium">{formatBDT(o.total)}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", paymentStyle[o.paymentStatus] ?? "bg-muted text-muted-foreground")}>
                            {o.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", statusStyle[o.status] ?? "bg-muted text-muted-foreground")}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                          {formatDateTime(o.createdAt)}
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
