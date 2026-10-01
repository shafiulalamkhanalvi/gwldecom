import Link from "next/link"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { safeJsonParse, formatBDT, formatDateTime } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ChevronRight } from "lucide-react"

export default async function OrdersPage() {
  const user = await getCurrentUser()!
  const orders = await db.order.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" }, include: { items: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } } })
  if (orders.length === 0) return <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center"><Package className="mb-3 h-12 w-12 text-muted-foreground" /><h2 className="text-lg font-semibold">No orders yet</h2><Link href="/category/all" className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start Shopping</Link></div>
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">My Orders</h1><p className="text-sm text-muted-foreground">{orders.length} order{orders.length !== 1 ? "s" : ""}</p></div>
      {orders.map((order) => {
        const addr = safeJsonParse<{ fullName?: string; city?: string; district?: string }>(order.shippingAddress, {})
        return (
          <Card key={order.id}>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/30 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3 text-sm"><span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-8).toUpperCase()}</span><span className="text-muted-foreground">{formatDateTime(order.createdAt)}</span><Badge variant="secondary" className="capitalize">{order.status}</Badge><Badge variant="outline" className="capitalize">{order.paymentMethod}</Badge></div>
                <span className="text-lg font-bold text-primary">{formatBDT(order.total)}</span>
              </div>
              <div className="p-4">
                <div className="space-y-3">{order.items.map((it) => <div key={it.id} className="flex items-center gap-3">{it.product.images[0]?.url ? <img src={it.product.images[0].url} alt={it.product.title} className="h-12 w-12 rounded-md object-cover" /> : <div className="h-12 w-12 rounded-md bg-muted" />}<div className="min-w-0 flex-1"><Link href={`/product/${it.product.slug}`} className="line-clamp-1 text-sm font-medium hover:text-primary">{it.product.title}</Link><p className="text-xs text-muted-foreground">Qty: {it.quantity} · {formatBDT(it.unitPrice)}</p></div><span className="text-sm font-semibold">{formatBDT(it.unitPrice * it.quantity)}</span></div>)}</div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>Shipping to: {addr.fullName}, {addr.city}, {addr.district}</span><span className="flex items-center gap-1 font-medium text-primary">View Details <ChevronRight className="h-4 w-4" /></span></div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
