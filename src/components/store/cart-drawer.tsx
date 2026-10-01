"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/lib/cart-store"
import { formatBDT } from "@/lib/utils"
export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const items = useCart((s) => s.items)
  const remove = useCart((s) => s.remove)
  const setQty = useCart((s) => s.setQty)
  const subtotal = useCart((s) => s.subtotal())
  useEffect(() => { const o = () => setOpen(true); window.addEventListener("shophaat:open-cart", o); return () => window.removeEventListener("shophaat:open-cart", o) }, [])
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4"><SheetTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Your Cart ({items.length})</SheetTitle></SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-semibold">Your cart is empty</p>
            <Button asChild onClick={() => setOpen(false)} className="mt-2"><Link href="/category/all">Start Shopping</Link></Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto scroll-thin px-4 py-4">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 rounded-lg border bg-card p-3">
                  {it.image && <img src={it.image} alt={it.title} className="h-20 w-20 shrink-0 rounded-md object-cover" />}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/product/${it.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-medium hover:text-primary">{it.title}</Link>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-md border">
                        <button onClick={() => setQty(it.id, it.quantity - 1)} className="grid h-7 w-7 place-items-center hover:bg-accent" aria-label="Decrease"><Minus className="h-3 w-3" /></button>
                        <span className="w-8 text-center text-sm font-medium">{it.quantity}</span>
                        <button onClick={() => setQty(it.id, it.quantity + 1)} className="grid h-7 w-7 place-items-center hover:bg-accent" aria-label="Increase"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-sm font-semibold text-primary">{formatBDT(it.price * it.quantity)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="border-t bg-card px-5 py-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-sm text-muted-foreground">Subtotal</span><span className="text-lg font-bold">{formatBDT(subtotal)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild onClick={() => setOpen(false)}><Link href="/category/all">Continue</Link></Button>
                <Button asChild onClick={() => setOpen(false)}><Link href="/checkout">Checkout</Link></Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
