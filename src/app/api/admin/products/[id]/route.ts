import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"
import { emitStoreEvent } from "@/lib/extensions/events"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/admin/products/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      images: { orderBy: { position: "asc" } },
    },
  })
  if (!product) return fail("Product not found", 404)

  return ok({
    ...product,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    specifications: JSON.parse(product.specifications || "[]"),
    attributes: JSON.parse(product.attributes || "{}"),
  })
}

// PUT /api/admin/products/[id]
export async function PUT(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return fail("Product not found", 404)

  let body: any
  try {
    body = await req.json()
  } catch {
    return fail("Invalid JSON body")
  }

  const title = String(body?.title ?? "").trim()
  const sku = String(body?.sku ?? "").trim()
  if (!title) return fail("Title is required")
  if (!sku) return fail("SKU is required")

  const slug = String(body?.slug ?? "").trim() || slugify(title)
  if (!slug) return fail("Slug is required")

  const price = Number(body?.price ?? 0)
  if (Number.isNaN(price) || price < 0) return fail("Price must be a non-negative number")

  const compareAtPrice =
    body?.compareAtPrice === "" || body?.compareAtPrice == null ? null : Number(body.compareAtPrice)
  if (compareAtPrice != null && (Number.isNaN(compareAtPrice) || compareAtPrice < 0))
    return fail("Compare-at price must be a non-negative number")

  const stockQuantity = Number(body?.stockQuantity ?? 0)
  if (Number.isNaN(stockQuantity) || stockQuantity < 0) return fail("Stock must be a non-negative integer")

  const status = ["draft", "published", "archived"].includes(body?.status) ? body.status : "draft"
  const categoryId = body?.categoryId ? String(body.categoryId) : null
  const brandId = body?.brandId ? String(body.brandId) : null

  if (slug !== existing.slug) {
    const clash = await db.product.findUnique({ where: { slug } })
    if (clash) return fail(`Slug "${slug}" is already in use`, 409)
  }
  if (sku !== existing.sku) {
    const clash = await db.product.findUnique({ where: { sku } })
    if (clash) return fail(`SKU "${sku}" is already in use`, 409)
  }

  const images: { url: string; altText?: string | null; position: number }[] = Array.isArray(body?.images)
    ? body.images
        .map((img: any, i: number) => ({
          url: String(img?.url ?? "").trim(),
          altText: img?.altText ? String(img.altText) : null,
          position: typeof img?.position === "number" ? img.position : i,
        }))
        .filter((im: { url: string }) => im.url)
    : []

  const specifications = JSON.stringify(
    Array.isArray(body?.specifications) ? body.specifications.filter((s: any) => s?.k || s?.v) : []
  )
  const attributes = JSON.stringify(
    body?.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)
      ? body.attributes
      : {}
  )
  const tags = String(body?.tags ?? "").trim()

  const updated = await db.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } })
    return tx.product.update({
      where: { id },
      data: {
        title,
        slug,
        description: String(body?.description ?? "").trim(),
        price,
        compareAtPrice,
        stockQuantity: Math.floor(stockQuantity),
        sku,
        status,
        categoryId,
        brandId,
        specifications,
        attributes,
        tags,
        images: images.length ? { create: images } : undefined,
      },
    })
  })

  await audit({
    actorId: user.id,
    action: "product.update",
    entityType: "Product",
    entityId: id,
    metadata: { title, slug, sku, status },
  })

  emitStoreEvent("product.updated", updated.id, { via: "admin" })
  return ok({ id: updated.id, slug: updated.slug })
}

// DELETE /api/admin/products/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.product.findUnique({ where: { id }, select: { id: true, title: true, slug: true } })
  if (!existing) return fail("Product not found", 404)

  // Block delete if referenced by order items (would break order history)
  const orderItems = await db.orderItem.count({ where: { productId: id } })
  if (orderItems > 0) {
    await db.product.update({ where: { id }, data: { status: "archived" } })
    await audit({
      actorId: user.id,
      action: "product.archive",
      entityType: "Product",
      entityId: id,
      metadata: { reason: "referenced by orders", title: existing.title },
    })
    emitStoreEvent("product.updated", id, { via: "admin", archived: true })
    return ok({ archived: true, reason: "Product is referenced by orders and was archived instead." })
  }

  await db.product.delete({ where: { id } })
  await audit({
    actorId: user.id,
    action: "product.delete",
    entityType: "Product",
    entityId: id,
    metadata: { title: existing.title, slug: existing.slug },
  })

  emitStoreEvent("product.deleted", id, { via: "admin" })
  return ok({ deleted: true })
}
