import { redirect } from "next/navigation"
import { requireAdminOrStaff } from "@/lib/session"
import { AdminShell } from "@/components/admin/admin-shell"

export const metadata = {
  title: "Admin Console",
  description: "ShopHaat staff & admin dashboard",
}

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminOrStaff()
  if (!user) {
    redirect("/login?error=AccessDenied")
  }

  return (
    <div className="bg-muted/30">
      <AdminShell
        user={{ name: user.fullName, email: user.email, role: user.role }}
      >
        {children}
      </AdminShell>
    </div>
  )
}
