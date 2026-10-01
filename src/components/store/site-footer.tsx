import Link from "next/link"
import { db } from "@/lib/db"
import { Truck, ShieldCheck, BadgePercent, Headphones, MapPin, Phone, Mail } from "lucide-react"
export async function SiteFooter() {
  const cats = await db.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" }, select: { name: true, slug: true }, take: 6 })
  return (
    <footer className="mt-auto border-t bg-secondary/30">
      <div className="border-b bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-8 md:grid-cols-4">
          {[{icon:Truck,t:"Fast Delivery"},{icon:ShieldCheck,t:"Genuine Products"},{icon:BadgePercent,t:"Best Prices"},{icon:Headphones,t:"24/7 Support"}].map(v=>(
            <div key={v.t} className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary"><v.icon className="h-5 w-5" /></div><span className="text-sm font-medium">{v.t}</span></div>
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">S</span><span className="text-xl font-extrabold">Shop<span className="text-primary">Haat</span></span></Link>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">Bangladesh's friendly online marketplace. Shop genuine products with fast delivery and easy returns.</p>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Gulshan 1, Dhaka 1212</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +880 1710-000001</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> hello@shophaat.com</p>
          </div>
        </div>
        <div><h3 className="mb-3 text-sm font-semibold">Shop</h3><ul className="space-y-2 text-sm text-muted-foreground">{cats.map(c=><li key={c.slug}><Link href={`/category/${c.slug}`} className="hover:text-primary">{c.name}</Link></li>)}</ul></div>
        <div><h3 className="mb-3 text-sm font-semibold">Company</h3><ul className="space-y-2 text-sm text-muted-foreground"><li><Link href="/about-us" className="hover:text-primary">About Us</Link></li><li><Link href="/contact-us" className="hover:text-primary">Contact Us</Link></li><li><Link href="/faq" className="hover:text-primary">Help &amp; FAQ</Link></li></ul></div>
        <div><h3 className="mb-3 text-sm font-semibold">Payment</h3><div className="flex flex-wrap gap-2">{["bKash","Nagad","Rocket","VISA","Mastercard","COD"].map(p=><span key={p} className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">{p}</span>)}</div></div>
      </div>
      <div className="border-t bg-background"><div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} ShopHaat. All rights reserved.</div></div>
    </footer>
  )
}
