"use client"
import Link from "next/link"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { Search, ShoppingCart, User, Menu, Heart, Package, LogOut, ChevronDown, Phone, Truck, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCart } from "@/lib/cart-store"
import { useRouter } from "next/navigation"

type Cat = { id: string; name: string; slug: string; imageUrl?: string | null }
export function HeaderInner({ categories }: { categories: Cat[] }) {
  const { data: session } = useSession()
  const count = useCart((s) => s.count())
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const router = useRouter()
  function submitSearch(e: React.FormEvent) { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`) }
  function openCart() { window.dispatchEvent(new CustomEvent("shophaat:open-cart")) }
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 py-1.5 sm:px-6">
          <span className="hidden shrink-0 items-center gap-1.5 font-medium sm:flex"><Phone className="h-3.5 w-3.5" /> +880 1710-000001</span>
          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
              {["🚚 Free delivery on orders over ৳2000","🔥 Flash Sale: Up to 50% off Electronics","💳 Pay with bKash, Nagad, Rocket or COD","↩️ 7-day easy returns"].concat(["🚚 Free delivery on orders over ৳2000","🔥 Flash Sale: Up to 50% off Electronics","💳 Pay with bKash, Nagad, Rocket or COD","↩️ 7-day easy returns"]).map((t,i)=><span key={i}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto scroll-thin">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">S</span>ShopHaat</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-1">
                {categories.map((c) => <Link key={c.id} href={`/category/${c.slug}`} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">{c.name}</Link>)}
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground shadow-sm">S</span>
            <span className="hidden text-xl font-extrabold tracking-tight sm:block">Shop<span className="text-primary">Haat</span></span>
          </Link>
          <form onSubmit={submitSearch} className="relative flex-1 max-w-xl">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products, brands and more…" className="h-10 rounded-full border-2 border-primary/30 bg-background pr-12 focus-visible:border-primary" />
            <Button type="submit" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full" aria-label="Search"><Search className="h-4 w-4" /></Button>
          </form>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="gap-1.5 px-2 sm:px-3" aria-label="Account"><User className="h-5 w-5" /><span className="hidden text-sm font-medium sm:inline">{session?.user?.name ? session.user.name.split(" ")[0] : "Account"}</span><ChevronDown className="hidden h-3.5 w-3.5 opacity-60 sm:inline" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal"><div className="flex flex-col"><span className="text-sm font-medium leading-none">{session?.user?.name ?? "Guest"}</span><span className="text-xs text-muted-foreground">{session?.user?.email ?? "Not signed in"}</span></div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              {session?.user ? (
                <>
                  <DropdownMenuItem asChild><Link href="/account"><User className="mr-2 h-4 w-4" /> My Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/orders"><Package className="mr-2 h-4 w-4" /> Orders</Link></DropdownMenuItem>
                  {["admin","staff"].includes(session.user.role) && <DropdownMenuItem asChild><Link href="/admin">Admin Panel</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/api/auth/signout"><LogOut className="mr-2 h-4 w-4" /> Sign out</Link></DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link href="/login">Sign in</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/register">Create account</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openCart} variant="ghost" className="relative gap-1.5 px-2 sm:px-3" aria-label="Cart">
            <div className="relative"><ShoppingCart className="h-5 w-5" />{count > 0 && <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count > 99 ? "99+" : count}</span>}</div>
            <span className="hidden text-sm font-medium sm:inline">Cart</span>
          </Button>
        </div>
        <nav className="hidden border-t bg-background md:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 py-1.5 text-sm">
            <Link href="/category/all" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium hover:bg-accent"><Menu className="h-4 w-4" /> All Categories</Link>
            {categories.slice(0, 8).map((c) => <Link key={c.id} href={`/category/${c.slug}`} className="rounded-md px-3 py-1.5 hover:bg-accent hover:text-primary">{c.name}</Link>)}
          </div>
        </nav>
      </div>
      <div className="hidden border-b bg-secondary/40 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-primary" /> Fast nationwide delivery</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> 100% genuine products</span>
        </div>
      </div>
    </header>
  )
}
