import Link from "next/link"
import { db } from "@/lib/db"
import { ProductCard } from "@/components/store/product-card"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q || "").trim()
  let cards: any[] = []
  if (query) {
    const raw = await db.product.findMany({ where: { status: "published", OR: [{ title: { contains: query } }, { description: { contains: query } }, { tags: { contains: query } }, { sku: { contains: query } }] }, orderBy: { createdAt: "desc" }, take: 40, include: { images: { orderBy: { position: "asc" }, take: 1 }, reviews: { select: { rating: true } } } })
    cards = raw.map((p) => ({ id: p.id, title: p.title, slug: p.slug, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null, imageUrl: p.images[0]?.url ?? null, stockQuantity: p.stockQuantity }))
  }
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-6"><h1 className="text-2xl font-bold sm:text-3xl">{query ? <>Search results for &ldquo;{query}&rdquo;</> : "Search products"}</h1>{query && <p className="mt-1 text-sm text-muted-foreground">{cards.length} products found</p>}</div>
      {query && cards.length === 0 ? <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center"><SearchX className="mb-3 h-12 w-12 text-muted-foreground" /><p className="text-lg font-semibold">No products found</p><Button asChild variant="outline" className="mt-4"><Link href="/category/all">Browse all products</Link></Button></div>
      : !query ? <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center"><p className="text-lg font-semibold">Start searching</p><Button asChild variant="outline" className="mt-4"><Link href="/category/all">Browse all products</Link></Button></div>
      : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{cards.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  )
}
