import { db } from "@/lib/db"
import { formatDate } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { BrandDialog } from "@/components/admin/brand-dialog"
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
import { Pencil, Plus, Tags } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  })

  return (
    <div>
      <AdminPageHeader
        title="Brands"
        description={`${brands.length} brand${brands.length === 1 ? "" : "s"} available for products.`}
        actions={
          <BrandDialog
            mode="create"
            trigger={
              <Button>
                <Plus className="size-4" /> New brand
              </Button>
            }
          />
        }
      />
      <Card>
        <CardContent className="p-0">
          {brands.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Tags className="size-6" />
              No brands yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">Brand</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {b.logoUrl ? (
                            <img src={b.logoUrl} alt={b.name} className="size-full object-cover" />
                          ) : null}
                        </div>
                        <span className="font-medium">{b.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">/{b.slug}</TableCell>
                    <TableCell className="text-right">{b._count.products}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <BrandDialog
                          mode="edit"
                          brand={b}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit brand">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <AdminDeleteButton
                          apiPath={`/api/admin/brands/${b.id}`}
                          description={`Delete "${b.name}"?${b._count.products > 0 ? ` Its ${b._count.products} product(s) will be detached from this brand.` : ""}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
