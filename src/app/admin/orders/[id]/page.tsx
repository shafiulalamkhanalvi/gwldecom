import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatBDT, formatDateTime, cn, safeJsonParse } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { OrderStatusManager } from "@/components/admin/order-status-manager"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, MapPin, User, CreditCard } from "lucide-react"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
}

const paymentLabels: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  sslcommerz: "SSLCommerz",
}

export default async function AdminOrderDetailPage({ params }: Ctx) {
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              sku: true,
              images: { select: { url: true }, take: 1, orderBy: { position: "asc" } },
            },
          },
        },
      },
    },
  })
  if (!order) notFound()

  const shipping = safeJsonParse<Record<string, string>>(order.shippingAddress, {})
  const subtotal = order.items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)

  return (
    <div>
      <AdminPageHeader
        title={`Order #${order.id.slice(-6).toUpperCase()}`}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/orders">
              <ArrowLeft className="size-4" /> Back to orders
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-base">Items</CardTitle>
                <CardDescription>{order.items.length} line item(s)</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", statusStyle[order.status] ?? "bg-muted")}>
                  {order.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="pr-6 text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                            {item.product.images[0]?.url ? (
                              <img src={item.product.images[0].url} alt="" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-medium">{item.product.title}</p>
                            <p className="font-mono text-xs text-muted-foreground">{item.product.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatBDT(item.unitPrice)}</TableCell>
                      <TableCell className="pr-6 text-right font-medium">
                        {formatBDT(Number(item.unitPrice) * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatBDT(Math.max(0, Number(order.total) - subtotal))}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Grand total</span>
                <span>{formatBDT(order.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update status</CardTitle>
              <CardDescription>Change order & payment status.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderStatusManager
                orderId={order.id}
                status={order.status}
                paymentStatus={order.paymentStatus}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customer?.fullName ?? "—"}</p>
              <p className="text-muted-foreground">{order.customer?.email}</p>
              <p className="text-muted-foreground">{order.customer?.phone ?? "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4" /> Shipping address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {shipping.fullName ? (
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{shipping.fullName}</p>
                  <p>{shipping.phone}</p>
                  <p>{shipping.addressLine1}</p>
                  {(shipping.city || shipping.district) && (
                    <p>
                      {shipping.city}
                      {shipping.city && shipping.district ? ", " : ""}
                      {shipping.district}
                    </p>
                  )}
                  {shipping.postalCode && <p>{shipping.postalCode}</p>}
                </div>
              ) : (
                <p>No shipping address recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" /> Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{paymentLabels[order.paymentMethod] ?? order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : order.paymentStatus === "refunded" ? "bg-zinc-200" : "bg-rose-100 text-rose-800")}>
                  {order.paymentStatus}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
