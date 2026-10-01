import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { User, Package, Heart, MapPin, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login?callbackUrl=/account")
  const nav = [
    { href: "/account", label: "Profile", icon: User },
    { href: "/account/orders", label: "My Orders", icon: Package },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  ]
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">{user.fullName?.[0] || user.email[0].toUpperCase()}</div>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{user.fullName || "User"}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
            </div>
            <nav className="space-y-1">
              {nav.map((n) => <Link key={n.href} href={n.href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-primary"><n.icon className="h-4 w-4" /> {n.label}</Link>)}
              <Button asChild variant="ghost" className="mt-2 w-full justify-start gap-2.5 text-foreground/80 hover:text-destructive"><Link href="/api/auth/signout"><LogOut className="h-4 w-4" /> Sign out</Link></Button>
            </nav>
          </div>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  )
}
