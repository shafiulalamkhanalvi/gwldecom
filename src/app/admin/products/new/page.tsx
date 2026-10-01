import { db } from "@/lib/db"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ProductForm } from "@/components/admin/product-form"

export const dynamic = "force-dynamic"

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  return (
    <div>
      <AdminPageHeader title="New product" description="Add a new product to your catalogue." />
      <ProductForm mode="create" categories={categories} brands={brands} />
    </div>
  )
}
