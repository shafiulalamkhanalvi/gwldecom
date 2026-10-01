import Link from "next/link"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { ProductCard } from "@/components/store/product-card"
import { Heart } from "lucide-react"

export default async function WishlistPage() {
  const user = await getCurrentUser()!
  const items = await db.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 }, reviews: { select: { rating: true } } } } } })
  const products = items.map((i) => ({ id: i.product.id, title: i.product.title, slug: i.product.slug, price: Number(i.product.price), compareAtPrice: i.product.compareAtPrice ? Number(i.product.compareAtPrice) : null, imageUrl: i.product.images[0]?.url ?? null, stockQuantity: i.product.stockQuantity }))
  if (products.length === 0) return <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center"><Heart className="mb-3 h-12 w-12 text-muted-foreground" /><h2 className="text-lg font-semibold">Your wishlist is empty</h2><Link href="/category/all" className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Discover Products</Link></div>
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">My Wishlist</h1><p className="text-sm text-muted-foreground">{products.length} saved item{products.length !== 1 ? "s" : ""}</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div></div>
}
