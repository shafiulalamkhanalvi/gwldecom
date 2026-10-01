import Link from "next/link"
import { db } from "@/lib/db"
import { HeroCarousel } from "@/components/store/hero-carousel"
import { ProductCard } from "@/components/store/product-card"
import { formatBDT } from "@/lib/utils"
import { ArrowRight, Flame, Star, Truck, ShieldCheck, BadgePercent, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"

export const revalidate = 60

export default async function HomePage() {
  const [banners, categories, featuredRaw, flashRaw, brands] = await Promise.all([
    db.banner.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    db.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { status: "published" }, orderBy: { createdAt: "desc" }, take: 10, include: { images: { orderBy: { position: "asc" } }, reviews: { select: { rating: true } } } }),
    db.product.findMany({ where: { status: "published", compareAtPrice: { not: null } }, take: 8, include: { images: { orderBy: { position: "asc" } }, reviews: { select: { rating: true } } } }),
    db.brand.findMany({ take: 8, orderBy: { name: "asc" } }),
  ])
  const toCards = (ps: typeof featuredRaw) => ps.map((p) => ({ id: p.id, title: p.title, slug: p.slug, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null, imageUrl: p.images[0]?.url ?? null, stockQuantity: p.stockQuantity }))
  const featured = toCards(featuredRaw)
  const flash = toCards(flashRaw)

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <section className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <HeroCarousel slides={banners.map((b) => ({ id: b.id, title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl }))} />
        <div className="hidden grid-rows-2 gap-3 lg:grid">
          <Link href="/category/electronics" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-orange-400 p-5 text-primary-foreground"><div className="relative z-10"><p className="text-xs font-semibold uppercase opacity-90">Mega Sale</p><h3 className="mt-1 text-xl font-bold">Up to 50% off<br />Electronics</h3><span className="mt-2 inline-flex items-center gap-1 text-sm font-medium group-hover:underline">Shop now <ArrowRight className="h-4 w-4" /></span></div></Link>
          <Link href="/category/fashion" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 p-5 text-white"><div className="relative z-10"><p className="text-xs font-semibold uppercase opacity-90">New In</p><h3 className="mt-1 text-xl font-bold">Fashion<br />Fiesta 2024</h3><span className="mt-2 inline-flex items-center gap-1 text-sm font-medium group-hover:underline">Explore <ArrowRight className="h-4 w-4" /></span></div></Link>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold sm:text-2xl">Shop by Category</h2><Link href="/category/all" className="text-sm font-medium text-primary hover:underline">View all</Link></div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted sm:h-20 sm:w-20">{c.imageUrl && <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />}</div>
              <span className="text-center text-xs font-medium sm:text-sm">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Flame className="h-5 w-5" /></span><h2 className="text-xl font-bold sm:text-2xl">Flash Sale</h2></div><Link href="/category/all" className="text-sm font-medium text-primary hover:underline">See more</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{flash.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="mt-10 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-orange-500 p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-sm font-semibold uppercase opacity-90">Limited time</p><h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">Flat ৳500 off on orders over ৳5000</h3><p className="mt-1 text-sm opacity-90">Use code <span className="rounded bg-white/20 px-2 py-0.5 font-mono font-bold">MEGA500</span> at checkout</p></div>
          <Button asChild size="lg" variant="secondary" className="shrink-0"><Link href="/category/all">Claim Offer</Link></Button>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold sm:text-2xl">New Arrivals</h2><Link href="/category/all" className="text-sm font-medium text-primary hover:underline">View all</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{featured.slice(0, 10).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="mt-10"><h2 className="mb-4 text-xl font-bold sm:text-2xl">Top Brands</h2><div className="grid grid-cols-4 gap-3 sm:grid-cols-8">{brands.map((b) => <Link key={b.id} href={`/search?q=${encodeURIComponent(b.name)}`} className="flex h-16 items-center justify-center rounded-xl border bg-card px-3 transition-all hover:border-primary/40 hover:shadow-sm"><span className="text-sm font-bold text-muted-foreground hover:text-primary">{b.name}</span></Link>)}</div></section>

      <section className="mt-12"><h2 className="mb-4 text-xl font-bold sm:text-2xl">What Our Customers Say</h2><div className="grid gap-4 md:grid-cols-3">
        {[{name:"Tania R.",city:"Dhaka",text:"Lightning fast delivery and genuine products. The iPhone I ordered arrived the next day!",rating:5},{name:"Imran H.",city:"Chattogram",text:"Best prices I could find anywhere. The bKash payment was smooth and the product was exactly as described.",rating:5},{name:"Sumaiya K.",city:"Sylhet",text:"Loved the easy returns. Ordered a dress in the wrong size and exchange was hassle-free.",rating:4}].map((t) => (
          <div key={t.name} className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-1">{Array.from({length:5}).map((_,i)=><Star key={i} className={`h-4 w-4 ${i<t.rating?"fill-amber-400 text-amber-400":"fill-muted text-muted-foreground/40"}`} />)}</div>
            <p className="text-sm text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
            <div className="mt-3 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">{t.name[0]}</div><div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs text-muted-foreground">{t.city}</p></div></div>
          </div>
        ))}
      </div></section>
    </div>
  )
}
