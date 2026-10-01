import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { ProductCard } from "@/components/store/product-card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (slug === "all") return { title: "All Products" }
  const cat = await db.category.findUnique({ where: { slug } })
  return cat ? { title: cat.name, description: `Shop ${cat.name} online on ShopHaat.` } : { title: "Category" }
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; brand?: string }> }) {
  const { slug } = await params
  const sp = await searchParams
  const sort = sp.sort || "newest"
  if (slug !== "all") {
    const cat = await db.category.findUnique({ where: { slug } })
    if (!cat) notFound()
  }
  const orderBy = sort === "price-asc" ? { price: "asc" as const } : sort === "price-desc" ? { price: "desc" as const } : { createdAt: "desc" as const }
  const where: any = { status: "published" }
  if (slug !== "all") {
    const cat = await db.category.findUnique({ where: { slug }, include: { children: { select: { id: true } } } })
    if (cat) {
      const ids = [cat.id, ...cat.children.map((c) => c.id)]
      where.categoryId = { in: ids }
    }
  }
  if (sp.brand) where.brandId = sp.brand
  const [products, brands] = await Promise.all([
    db.product.findMany({ where, orderBy, include: { images: { orderBy: { position: "asc" }, take: 1 }, reviews: { select: { rating: true } } } }),
    db.brand.findMany({ select: { id: true, name: true } }),
  ])
  const cards = products.map((p) => ({ id: p.id, title: p.title, slug: p.slug, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null, imageUrl: p.images[0]?.url ?? null, stockQuantity: p.stockQuantity }))

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <Breadcrumb className="mb-4"><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{slug === "all" ? "All Products" : slug}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold sm:text-3xl">{slug === "all" ? "All Products" : slug}</h1><p className="mt-1 text-sm text-muted-foreground">{cards.length} products</p></div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <Link href={`?sort=newest${sp.brand ? `&brand=${sp.brand}` : ""}`} className={`rounded-md px-2 py-1 text-sm ${sort === "newest" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Newest</Link>
          <Link href={`?sort=price-asc${sp.brand ? `&brand=${sp.brand}` : ""}`} className={`rounded-md px-2 py-1 text-sm ${sort === "price-asc" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Price ↑</Link>
          <Link href={`?sort=price-desc${sp.brand ? `&brand=${sp.brand}` : ""}`} className={`rounded-md px-2 py-1 text-sm ${sort === "price-desc" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Price ↓</Link>
        </div>
      </div>
      {cards.length === 0 ? <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center"><p className="text-lg font-semibold">No products found</p></div>
      : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{cards.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  )
}
