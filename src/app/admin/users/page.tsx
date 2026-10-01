import { db } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/session"
import { formatDate, cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { UsersFilters } from "@/components/admin/users-filters"
import { UserRoleManager } from "@/components/admin/user-role-manager"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

const roleStyle: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  staff: "bg-violet-100 text-violet-800",
  customer: "bg-muted text-muted-foreground",
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireAdminOrStaff()
  const sp = await searchParams
  const page = Math.max(1, parseInt(asString(sp.page) ?? "1", 10) || 1)
  const limit = 20
  const search = asString(sp.search)?.trim() ?? ""
  const role = asString(sp.role) ?? ""

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { fullName: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (role) where.role = role

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (role) params.set("role", role)
    params.set("page", String(p))
    return `/admin/users?${params.toString()}`
  }

  return (
    <div>
      <AdminPageHeader
        title="Users"
        description={`${total} user${total === 1 ? "" : "s"} registered.`}
      />
      <Card>
        <CardContent className="gap-4">
          <UsersFilters />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="pr-6 text-right">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isSelf = me?.id === u.id
                    const initials = (u.fullName ?? u.email ?? "U")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback className={cn("text-xs", roleStyle[u.role] ?? "bg-muted")}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-sm font-medium">
                                <span className="truncate">{u.fullName ?? "—"}</span>
                                {isSelf ? (
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                    You
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.phone ?? "—"}</TableCell>
                        <TableCell className="text-right">{u._count.orders}</TableCell>
                        <TableCell className="text-right">{u._count.reviews}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell className="pr-6">
                          <div className="flex justify-end">
                            <UserRoleManager userId={u.id} role={u.role} isSelf={isSelf} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </CardContent>
      </Card>
    </div>
  )
}

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}
