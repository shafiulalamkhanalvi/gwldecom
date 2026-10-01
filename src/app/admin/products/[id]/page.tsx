import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { safeJsonParse } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ProductForm, type ProductFormData } from "@/components/admin/product-form"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Ctx) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
    },
  })
  if (!product) notFound()

  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  const initial: Partial<ProductFormData> = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    stockQuantity: product.stockQuantity,
    sku: product.sku,
    status: product.status,
    categoryId: product.categoryId,
    brandId: product.brandId,
    tags: product.tags,
    images: product.images.map((img) => ({ url: img.url, altText: img.altText, position: img.position })),
    specifications: safeJsonParse<{ k: string; v: string }[]>(product.specifications, []),
    attributes: Object.entries(safeJsonParse<Record<string, string[]>>(product.attributes, {})).map(
      ([key, values]) => ({ key, values: Array.isArray(values) ? values.join(", ") : String(values) })
    ),
  }

  return (
    <div>
      <AdminPageHeader
        title="Edit product"
        description={product.title}
      />
      <ProductForm mode="edit" initial={initial} categories={categories} brands={brands} />
    </div>
  )
}
