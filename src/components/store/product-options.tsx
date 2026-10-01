"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ShoppingCart, Heart, Minus, Plus, Check, Truck, ShieldCheck, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useCart } from "@/lib/cart-store"
import { formatBDT, discountPercent, safeJsonParse } from "@/lib/utils"

export type ProductOption = { id: string; title: string; slug: string; price: number; compareAtPrice?: number | null; stockQuantity: number; attributes: Record<string, string[]>; rating?: number; reviewCount?: number }

export function ProductOptions({ p }: { p: ProductOption }) {
  const add = useCart((s) => s.add)
  const { data: session } = useSession()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [variant, setVariant] = useState<Record<string, string>>({})
  const [wished, setWished] = useState(false)
  const [adding, setAdding] = useState(false)
  const attrs = p.attributes || {}
  const attrKeys = Object.keys(attrs)
  const outOfStock = p.stockQuantity <= 0
  const disc = discountPercent(p.price, p.compareAtPrice ?? null)

  function handleAdd() {
    for (const k of attrKeys) { if (!variant[k]) { toast.error(`Please select ${k}`); return } }
    setAdding(true)
    add({ id: `${p.id}-${Object.values(variant).join("-")}`, productId: p.id, title: p.title, slug: p.slug, price: p.price, image: "", variant }, qty)
    toast.success("Added to cart")
    setAdding(false)
  }
  function buyNow() {
    for (const k of attrKeys) { if (!variant[k]) { toast.error(`Please select ${k}`); return } }
    add({ id: `${p.id}-${Object.values(variant).join("-")}`, productId: p.id, title: p.title, slug: p.slug, price: p.price, image: "", variant }, qty)
    router.push("/checkout")
  }
  async function handleWishlist() {
    if (!session) { router.push(`/login?callbackUrl=/product/${p.slug}`); return }
    try { const r = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: p.id }) }); const d = await r.json(); if (d.ok) { setWished(d.state === "added"); toast.success(d.state === "added" ? "Added to wishlist" : "Removed from wishlist") } else toast.error("Failed") } catch { toast.error("Network error") }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-extrabold text-primary">{formatBDT(p.price)}</span>
        {p.compareAtPrice && Number(p.compareAtPrice) > p.price && <span className="text-lg text-muted-foreground line-through">{formatBDT(p.compareAtPrice)}</span>}
        {disc > 0 && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">Save {disc}%</span>}
      </div>
      {attrKeys.map((key) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">{key}:</span>{variant[key] && <span className="text-sm text-primary">{variant[key]}</span>}</div>
          <div className="flex flex-wrap gap-2">
            {attrs[key].map((opt) => <button key={opt} onClick={() => setVariant((v) => ({ ...v, [key]: opt }))} className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${variant[key] === opt ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/30"}`}>{opt}</button>)}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 text-sm">
        {outOfStock ? <span className="flex items-center gap-1.5 font-medium text-destructive"><span className="h-2 w-2 rounded-full bg-destructive" /> Out of stock</span>
        : p.stockQuantity < 10 ? <span className="flex items-center gap-1.5 font-medium text-amber-600"><span className="h-2 w-2 rounded-full bg-amber-500" /> Only {p.stockQuantity} left</span>
        : <span className="flex items-center gap-1.5 font-medium text-emerald-600"><Check className="h-4 w-4" /> In stock</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center hover:bg-accent" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
          <span className="w-12 text-center font-semibold">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(p.stockQuantity || 99, q + 1))} className="grid h-10 w-10 place-items-center hover:bg-accent" aria-label="Increase"><Plus className="h-4 w-4" /></button>
        </div>
        <Button onClick={handleAdd} size="lg" className="flex-1 gap-2" disabled={outOfStock || adding}><ShoppingCart className="h-5 w-5" /> Add to Cart</Button>
        <Button onClick={buyNow} size="lg" variant="outline" disabled={outOfStock}>Buy Now</Button>
        <Button onClick={handleWishlist} size="icon" variant="outline" className="h-11 w-11" aria-label="Wishlist"><Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : ""}`} /></Button>
      </div>
      <div className="grid grid-cols-1 gap-2 rounded-xl border bg-secondary/30 p-4 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm"><Truck className="h-5 w-5 text-primary" /><div><p className="font-medium">Fast Delivery</p><p className="text-xs text-muted-foreground">1-5 business days</p></div></div>
        <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-5 w-5 text-primary" /><div><p className="font-medium">Genuine Product</p><p className="text-xs text-muted-foreground">100% authentic</p></div></div>
        <div className="flex items-center gap-2 text-sm"><RefreshCw className="h-5 w-5 text-primary" /><div><p className="font-medium">7-Day Returns</p><p className="text-xs text-muted-foreground">Easy returns</p></div></div>
      </div>
    </div>
  )
}
