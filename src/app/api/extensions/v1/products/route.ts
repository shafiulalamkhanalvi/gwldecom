import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { extensionRoute, preflight, logExtensionActivity } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"
import { serializeExtensionProduct } from "@/app/api/extensions/v1/_lib/serialize"
import { resolveProductInput } from "@/app/api/extensions/v1/_lib/product-input"
import { emitStoreEvent } from "@/lib/extensions/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INCLUDE = {
  category: true,
  brand: true,
  images: { orderBy: { position: "asc" as const } },
}

// GET /api/extensions/v1/products?search=&sku=&status=&page=&limit= — requires products:read
export const GET = extensionRoute({ scope: "products:read" }, async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20))
  const search = sp.get("search")?.trim()
  const sku = sp.get("sku")?.trim()
  const status = sp.get("status")?.trim()

  const where: Record<string, unknown> = {}
  if (search) where.OR = [{ title: { contains: search } }, { sku: { contains: search } }, { slug: { contains: search } }]
  if (sku) where.sku = sku
  if (status) where.status = status

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ])

  return extOk({
    items: products.map(serializeExtensionProduct),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
})

// POST /api/extensions/v1/products — direct create (no dedupe workflow; see
// POST /api/extensions/v1/import for the guided, dedupe-aware pipeline used
// by importer-style extensions). Requires products:write.
export const POST = extensionRoute({ scope: "products:write" }, async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return extFail("INVALID_PAYLOAD", "Request body must be valid JSON")
  }

  const resolved = await resolveProductInput(ctx, body)
  if (!resolved.ok) return resolved.response

  const { data, warnings } = resolved

  const [slugTaken, skuTaken] = await Promise.all([
    db.product.findUnique({ where: { slug: data.slug } }),
    db.product.findUnique({ where: { sku: data.sku } }),
  ])
  if (slugTaken) return extFail("DUPLICATE_PRODUCT", `A product with slug "${data.slug}" already exists`, { productId: slugTaken.id })
  if (skuTaken) return extFail("DUPLICATE_PRODUCT", `A product with SKU "${data.sku}" already exists`, { productId: skuTaken.id })

  const product = await db.product.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      specifications: data.specifications,
      attributes: data.attributes,
      tags: data.tags,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      stockQuantity: data.stockQuantity,
      sku: data.sku,
      status: data.status,
      categoryId: data.categoryId,
      brandId: data.brandId,
      sourceUrl: data.sourceUrl,
      source: `extension:${ctx.extension.id}`,
      createdById: ctx.user.id,
      images: data.images.length ? { create: data.images } : undefined,
    },
    include: INCLUDE,
  })

  emitStoreEvent("product.created", product.id, { via: ctx.extension.id })
  await logExtensionActivity({
    extensionId: ctx.extension.id,
    connectionId: ctx.connection.id,
    userId: ctx.user.id,
    action: "product.create",
    productId: product.id,
    sourceUrl: data.sourceUrl,
    status: "success",
  })

  return extOk({ product: serializeExtensionProduct(product), warnings }, 201)
})

export const OPTIONS = preflight
