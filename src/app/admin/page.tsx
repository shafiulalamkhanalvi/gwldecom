import Link from "next/link"
import {
  Package,
  PackageCheck,
  ShoppingCart,
  Clock,
  Banknote,
  Users,
  AlertTriangle,
  Ticket,
  ArrowRight,
} from "lucide-react"
import { db } from "@/lib/db"
import { formatBDT, formatDateTime, cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

type Stat = {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  href?: string
}

const statusVariant: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
}

export default async function AdminOverviewPage() {
  const [
    totalProducts,
    publishedProducts,
    totalOrders,
    pendingOrders,
    revenueAgg,
    customers,
    lowStock,
    activeCoupons,
    recentOrders,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "published" } }),
    db.order.count(),
    db.order.count({ where: { status: "pending" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }),
    db.user.count({ where: { role: "customer" } }),
    db.product.count({ where: { stockQuantity: { lte: 10 } } }),
    db.coupon.count({ where: { active: true } }),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true, email: true } },
        items: { select: { id: true, quantity: true } },
      },
    }),
  ])

  const revenue = revenueAgg._sum.total ?? 0

  const stats: Stat[] = [
    { label: "Total Products", value: totalProducts.toLocaleString(), icon: Package, accent: "text-primary bg-primary/10", href: "/admin/products" },
    { label: "Published", value: publishedProducts.toLocaleString(), hint: `${totalProducts - publishedProducts} draft/archived`, icon: PackageCheck, accent: "text-emerald-600 bg-emerald-100", href: "/admin/products" },
    { label: "Total Orders", value: totalOrders.toLocaleString(), icon: ShoppingCart, accent: "text-sky-600 bg-sky-100", href: "/admin/orders" },
    { label: "Pending Orders", value: pendingOrders.toLocaleString(), icon: Clock, accent: "text-amber-600 bg-amber-100", href: "/admin/orders?status=pending" },
    { label: "Revenue", value: formatBDT(revenue), hint: "Excluding cancelled", icon: Banknote, accent: "text-emerald-600 bg-emerald-100" },
    { label: "Customers", value: customers.toLocaleString(), icon: Users, accent: "text-violet-600 bg-violet-100", href: "/admin/users" },
    { label: "Low Stock", value: lowStock.toLocaleString(), hint: "≤ 10 units left", icon: AlertTriangle, accent: "text-rose-600 bg-rose-100", href: "/admin/products?stock=low" },
    { label: "Active Coupons", value: activeCoupons.toLocaleString(), icon: Ticket, accent: "text-amber-600 bg-amber-100" },
  ]

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="A snapshot of your store's performance and recent activity."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          const inner = (
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className={cn("inline-flex size-9 items-center justify-center rounded-lg", s.accent)}>
                    <Icon className="size-5" />
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  {s.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p> : null}
                </div>
              </CardContent>
            </Card>
          )
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          )
        })}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between border-b">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders">
              View all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="pr-6 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6 font-mono text-xs">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        #{o.id.slice(-6).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {o.customer?.fullName ?? o.customer?.email ?? "—"}
                    </TableCell>
                    <TableCell>{o.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", statusVariant[o.status] ?? "bg-muted text-muted-foreground")}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatBDT(o.total)}</TableCell>
                    <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
