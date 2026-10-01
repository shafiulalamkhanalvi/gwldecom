import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"
import { emitStoreEvent } from "@/lib/extensions/events"

export const dynamic = "force-dynamic"

// GET /api/admin/products — list with filters/search/pagination
export async function GET(req: NextRequest) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20))
  const search = sp.get("search")?.trim() ?? ""
  const status = sp.get("status") ?? ""
  const categoryId = sp.get("categoryId") ?? ""
  const brandId = sp.get("brandId") ?? ""
  const stock = sp.get("stock") ?? ""

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
  if (brandId) where.brandId = brandId
  if (stock === "low") where.stockQuantity = { lte: 10 }
  if (stock === "out") where.stockQuantity = { lte: 0 }

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { select: { url: true, altText: true, position: true }, orderBy: { position: "asc" } },
      },
    }),
  ])

  const items = products.map((p) => ({
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
  }))

  return ok({ items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) })
}

// POST /api/admin/products — create
export async function POST(req: NextRequest) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

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

  // uniqueness checks
  const existingSlug = await db.product.findUnique({ where: { slug } })
  if (existingSlug) return fail(`Slug "${slug}" is already in use`, 409)
  const existingSku = await db.product.findUnique({ where: { sku } })
  if (existingSku) return fail(`SKU "${sku}" is already in use`, 409)

  const images: { url: string; altText?: string; position: number }[] = Array.isArray(body?.images)
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

  const product = await db.product.create({
    data: {
      title,
      slug,
      description: String(body?.description ?? "").trim(),
      price,
      compareAtPrice,
      stockQuantity: Math.floor(stockQuantity),
      sku,
      status,
      currency: "BDT",
      categoryId,
      brandId,
      specifications,
      attributes,
      tags,
      source: "manual",
      createdById: user.id,
      images: images.length
        ? { create: images }
        : undefined,
    },
    include: { images: true },
  })

  await audit({
    actorId: user.id,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    metadata: { title, slug, sku, status },
  })

  emitStoreEvent("product.created", product.id, { via: "admin" })
  return ok({ id: product.id, slug: product.slug }, 201)
}
