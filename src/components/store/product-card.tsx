"use client"
import Link from "next/link"
import { ShoppingCart, Heart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-store"
import { formatBDT, discountPercent, cn } from "@/lib/utils"
export type ProductCardData = { id: string; title: string; slug: string; price: number | string; compareAtPrice?: number | string | null; imageUrl?: string | null; rating?: number; reviewCount?: number; stockQuantity?: number }
export function ProductCard({ p }: { p: ProductCardData }) {
  const add = useCart((s) => s.add)
  const disc = discountPercent(Number(p.price), p.compareAtPrice ? Number(p.compareAtPrice) : null)
  const outOfStock = (p.stockQuantity ?? 1) <= 0
  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (outOfStock) { toast.error("Out of stock"); return }
    add({ id: p.id, productId: p.id, title: p.title, slug: p.slug, price: Number(p.price), image: p.imageUrl ?? "" })
    toast.success("Added to cart")
  }
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {p.imageUrl ? <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" /> : <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {disc > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">-{disc}%</span>}
          {outOfStock && <span className="rounded-md bg-muted-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">OUT OF STOCK</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/product/${p.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug hover:text-primary">{p.title}</Link>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-primary">{formatBDT(p.price)}</span>
          {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && <span className="text-xs text-muted-foreground line-through">{formatBDT(p.compareAtPrice)}</span>}
        </div>
        <Button onClick={handleAdd} size="sm" variant="secondary" className="mt-3 w-full gap-1.5" disabled={outOfStock}><ShoppingCart className="h-4 w-4" />{outOfStock ? "Out of Stock" : "Add to Cart"}</Button>
      </div>
    </div>
  )
}
