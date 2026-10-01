import { db } from "@/lib/db"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CategoriesManager } from "@/components/admin/categories-manager"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true, children: true } } },
  })

  const flat = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
    childCount: c._count.children,
  }))

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}, organised as a tree.`}
      />
      <Card>
        <CardContent>
          <CategoriesManager categories={flat} />
        </CardContent>
      </Card>
    </div>
  )
}
