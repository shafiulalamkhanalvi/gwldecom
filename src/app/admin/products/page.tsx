import Link from "next/link"
import { Plus, Pencil } from "lucide-react"
import { db } from "@/lib/db"
import { formatBDT, formatDate, cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { ProductsFilters } from "@/components/admin/admin-products-filters"
import { AdminDeleteButton } from "@/components/admin/admin-delete-button"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

const statusStyle: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-800",
  draft: "bg-amber-100 text-amber-800",
  archived: "bg-zinc-200 text-zinc-700",
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(asString(sp.page) ?? "1", 10) || 1)
  const limit = 15
  const search = asString(sp.search)?.trim() ?? ""
  const status = asString(sp.status) ?? ""
  const categoryId = asString(sp.categoryId) ?? ""
  const stock = asString(sp.stock) ?? ""

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { sku: { contains: search } },
      { slug: { contains: search } },
    ]
  }
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId
  if (stock === "low") where.stockQuantity = { lte: 10 }
  if (stock === "out") where.stockQuantity = { lte: 0 }

  const [total, products, categories] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { select: { url: true }, take: 1, orderBy: { position: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status) params.set("status", status)
    if (categoryId) params.set("categoryId", categoryId)
    if (stock) params.set("stock", stock)
    params.set("page", String(p))
    return `/admin/products?${params.toString()}`
  }

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"} in your catalogue.`}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4" /> New product
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="gap-4">
          <ProductsFilters categories={categories} />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No products found. Try adjusting your filters or{" "}
                      <Link href="/admin/products/new" className="font-medium text-primary hover:underline">
                        create a new product
                      </Link>
                      .
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                            {p.images[0]?.url ? (
                              <img src={p.images[0].url} alt="" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                              <span className="line-clamp-1">{p.title}</span>
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">/product/{p.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.category?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.brand?.name ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatBDT(p.price)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-medium", p.stockQuantity <= 0 && "text-destructive", p.stockQuantity > 0 && p.stockQuantity <= 10 && "text-amber-600")}>
                          {p.stockQuantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize", statusStyle[p.status] ?? "bg-muted text-muted-foreground")}>
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" aria-label="Edit">
                            <Link href={`/admin/products/${p.id}`}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                          <AdminDeleteButton apiPath={`/api/admin/products/${p.id}`} description={`Delete "${p.title}". If it has orders it will be archived instead.`} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
