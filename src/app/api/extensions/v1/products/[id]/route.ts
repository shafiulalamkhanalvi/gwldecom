import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { extensionRoute, preflight, logExtensionActivity } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"
import { serializeExtensionProduct } from "@/app/api/extensions/v1/_lib/serialize"
import { resolveProductInput } from "@/app/api/extensions/v1/_lib/product-input"
import { emitStoreEvent } from "@/lib/extensions/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INCLUDE = { category: true, brand: true, images: { orderBy: { position: "asc" as const } } }

// GET /api/extensions/v1/products/:id — requires products:read
export const GET = extensionRoute({ scope: "products:read" }, async (req, _ctx) => {
  const id = req.nextUrl.pathname.split("/").pop() as string
  const product = await db.product.findUnique({ where: { id }, include: INCLUDE })
  if (!product) return extFail("NOT_FOUND", `No product with id "${id}"`)
  return extOk({ product: serializeExtensionProduct(product) })
})

// PATCH /api/extensions/v1/products/:id — partial update. Requires products:write.
// IDs are always re-verified against the database — never trusted at face value (anti-IDOR: any
// authenticated connection with products:write may update any product, matching the existing
// admin model where staff can edit any product; there is no per-product ownership concept here).
export const PATCH = extensionRoute({ scope: "products:write" }, async (req, ctx) => {
  const id = req.nextUrl.pathname.split("/").slice(-1)[0]
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return extFail("NOT_FOUND", `No product with id "${id}"`)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return extFail("INVALID_PAYLOAD", "Request body must be valid JSON")
  }

  const resolved = await resolveProductInput(ctx, body, { partial: true })
  if (!resolved.ok) return resolved.response
  const { data, warnings } = resolved

  if (data.slug && data.slug !== existing.slug) {
    const clash = await db.product.findUnique({ where: { slug: data.slug } })
    if (clash) return extFail("DUPLICATE_PRODUCT", `A product with slug "${data.slug}" already exists`, { productId: clash.id })
  }
  if (data.sku && data.sku !== existing.sku) {
    const clash = await db.product.findUnique({ where: { sku: data.sku } })
    if (clash) return extFail("DUPLICATE_PRODUCT", `A product with SKU "${data.sku}" already exists`, { productId: clash.id })
  }

  const b = (typeof body === "object" && body) || {}
  const product = await db.product.update({
    where: { id },
    data: {
      ...("title" in b ? { title: data.title } : {}),
      ...("slug" in b ? { slug: data.slug } : {}),
      ...("description" in b ? { description: data.description } : {}),
      ...("specifications" in b ? { specifications: data.specifications } : {}),
      ...("attributes" in b ? { attributes: data.attributes } : {}),
      ...("tags" in b ? { tags: data.tags } : {}),
      ...("price" in b ? { price: data.price } : {}),
      ...("compareAtPrice" in b ? { compareAtPrice: data.compareAtPrice } : {}),
      ...("stockQuantity" in b ? { stockQuantity: data.stockQuantity } : {}),
      ...("sku" in b ? { sku: data.sku } : {}),
      ...("status" in b ? { status: data.status } : {}),
      ...("categoryId" in b || "categoryName" in b ? { categoryId: data.categoryId } : {}),
      ...("brandId" in b || "brandName" in b ? { brandId: data.brandId } : {}),
      ...("images" in b ? { images: { deleteMany: {}, create: data.images } } : {}),
    },
    include: INCLUDE,
  })

  emitStoreEvent("product.updated", product.id, { via: ctx.extension.id })
  await logExtensionActivity({
    extensionId: ctx.extension.id,
    connectionId: ctx.connection.id,
    userId: ctx.user.id,
    action: "product.update",
    productId: product.id,
    status: "success",
  })

  return extOk({ product: serializeExtensionProduct(product), warnings })
})

// DELETE /api/extensions/v1/products/:id — requires products:delete (separate from products:write
// on purpose: an importer only needs write, deletion is a more sensitive, opt-in-only scope).
export const DELETE = extensionRoute({ scope: "products:delete" }, async (req, ctx) => {
  const id = req.nextUrl.pathname.split("/").pop() as string
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return extFail("NOT_FOUND", `No product with id "${id}"`)

  await db.product.delete({ where: { id } })

  emitStoreEvent("product.deleted", id, { via: ctx.extension.id })
  await logExtensionActivity({
    extensionId: ctx.extension.id,
    connectionId: ctx.connection.id,
    userId: ctx.user.id,
    action: "product.delete",
    productId: id,
    status: "success",
  })

  return extOk({ productId: id, status: "deleted" })
})

export const OPTIONS = preflight
