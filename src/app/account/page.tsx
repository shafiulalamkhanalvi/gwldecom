import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Heart, ShoppingBag } from "lucide-react"
import { formatBDT } from "@/lib/utils"
import Link from "next/link"

export default async function AccountOverview() {
  const user = await getCurrentUser()!
  const [orderCount, wishlistCount] = await Promise.all([db.order.count({ where: { customerId: user.id } }), db.wishlist.count({ where: { userId: user.id } })])
  const stats = [{ label: "Total Orders", value: orderCount, icon: Package, href: "/account/orders" }, { label: "Wishlist Items", value: wishlistCount, icon: Heart, href: "/account/wishlist" }]
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">My Account</h1><p className="text-sm text-muted-foreground">Welcome back, {user.fullName?.split(" ")[0] || "shopper"}!</p></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{stats.map((s) => <Link key={s.label} href={s.href}><Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="p-4"><div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card></Link>)}</div>
      <Card><CardHeader><CardTitle>Account Details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{user.fullName || "—"}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user.email}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{user.phone || "—"}</span></div></CardContent></Card>
    </div>
  )
}
