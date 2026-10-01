import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { sanitizeExtensionLine, sanitizeExtensionText } from "@/lib/extensions/sanitize"
import { validateExtensionImageUrl } from "@/lib/extensions/media"
import { extFail, type ExtensionErrorCode } from "@/app/api/extensions/v1/_lib/response"
import type { ExtensionRequestContext } from "@/app/api/extensions/v1/_lib/auth"

const MAX_IMAGES = 12
const VALID_STATUSES = new Set(["draft", "published"]) // extensions may not directly archive

export type ResolvedProductInput = {
  title: string
  slug: string
  description: string
  specifications: string
  attributes: string
  tags: string
  price: number
  compareAtPrice: number | null
  stockQuantity: number
  sku: string
  status: string
  categoryId: string | null
  brandId: string | null
  sourceUrl: string | null
  images: { url: string; altText: string | null; position: number }[]
}

export type ProductInputError = { ok: false; code: ExtensionErrorCode; response: Response }
export type ProductInputSuccess = { ok: true; data: ResolvedProductInput; warnings: string[] }

function fail(code: ExtensionErrorCode, message: string, extra?: Record<string, unknown>): ProductInputError {
  return { ok: false, code, response: extFail(code, message, extra) }
}

/**
 * Validates and resolves an extension-supplied product payload into
 * Prisma-ready data. Shared by POST /products and POST /import so both
 * paths enforce identical rules — this is "the business logic", the routes
 * are thin wrappers around it. Everything here treats `body` as fully
 * untrusted: unknown fields are ignored, every string is sanitized/length
 * capped, category/brand IDs are re-verified against the database rather
 * than trusted, and image URLs are SSRF-checked + content-sniffed before
 * being accepted.
 */
export async function resolveProductInput(
  ctx: ExtensionRequestContext,
  body: unknown,
  opts: { partial?: boolean } = {}
): Promise<ProductInputSuccess | ProductInputError> {
  if (!body || typeof body !== "object") return fail("INVALID_PAYLOAD", "Request body must be a JSON object")
  const b = body as Record<string, unknown>
  const warnings: string[] = []

  const title = sanitizeExtensionLine(b.title, 300)
  if (!opts.partial && !title) return fail("VALIDATION_ERROR", "`title` is required")

  const sku = sanitizeExtensionLine(b.sku, 100)
  if (!opts.partial && !sku) return fail("VALIDATION_ERROR", "`sku` is required")

  const slugInput = sanitizeExtensionLine(b.slug, 200)
  const slug = slugInput || (title ? slugify(title) : "")
  if (!opts.partial && !slug) return fail("VALIDATION_ERROR", "Could not derive a slug from `title` — provide `slug` explicitly")

  const price = b.price === undefined ? undefined : Number(b.price)
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) return fail("VALIDATION_ERROR", "`price` must be a non-negative number")
  if (!opts.partial && price === undefined) return fail("VALIDATION_ERROR", "`price` is required")

  let compareAtPrice: number | null | undefined
  if (b.compareAtPrice !== undefined) {
    compareAtPrice = b.compareAtPrice === null ? null : Number(b.compareAtPrice)
    if (compareAtPrice != null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)) {
      return fail("VALIDATION_ERROR", "`compareAtPrice` must be a non-negative number or null")
    }
  }

  let stockQuantity: number | undefined
  if (b.stockQuantity !== undefined) {
    stockQuantity = Math.floor(Number(b.stockQuantity))
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) return fail("VALIDATION_ERROR", "`stockQuantity` must be a non-negative integer")
  }

  let status = "draft"
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !VALID_STATUSES.has(b.status)) {
      return fail("VALIDATION_ERROR", `\`status\` must be one of: ${[...VALID_STATUSES].join(", ")}`)
    }
    status = b.status
  }

  // ---- Category: accept an existing categoryId, or resolve/create by name ----
  let categoryId: string | null = null
  if (b.categoryId !== undefined && b.categoryId !== null) {
    const cat = await db.category.findUnique({ where: { id: String(b.categoryId) } })
    if (!cat) return fail("CATEGORY_NOT_FOUND", `No category with id "${b.categoryId}"`)
    categoryId = cat.id
  } else if (typeof b.categoryName === "string" && b.categoryName.trim()) {
    const name = sanitizeExtensionLine(b.categoryName, 150)
    const existing = await db.category.findFirst({ where: { name } })
    if (existing) {
      categoryId = existing.id
    } else if (ctx.scopes.includes("categories:write")) {
      const created = await db.category.create({ data: { name, slug: slugify(name) || `category-${Date.now()}` } })
      categoryId = created.id
      warnings.push(`Created new category "${name}"`)
    } else {
      return fail("PERMISSION_DENIED", `Category "${name}" does not exist and this connection lacks "categories:write" to create it`)
    }
  }

  // ---- Brand: same pattern ----
  let brandId: string | null = null
  if (b.brandId !== undefined && b.brandId !== null) {
    const brand = await db.brand.findUnique({ where: { id: String(b.brandId) } })
    if (!brand) return fail("BRAND_NOT_FOUND", `No brand with id "${b.brandId}"`)
    brandId = brand.id
  } else if (typeof b.brandName === "string" && b.brandName.trim()) {
    const name = sanitizeExtensionLine(b.brandName, 150)
    const existing = await db.brand.findFirst({ where: { name } })
    if (existing) {
      brandId = existing.id
    } else if (ctx.scopes.includes("brands:write")) {
      const created = await db.brand.create({ data: { name, slug: slugify(name) || `brand-${Date.now()}` } })
      brandId = created.id
      warnings.push(`Created new brand "${name}"`)
    } else {
      return fail("PERMISSION_DENIED", `Brand "${name}" does not exist and this connection lacks "brands:write" to create it`)
    }
  }

  // ---- Images: SSRF + content-type validated, capped in count ----
  const images: { url: string; altText: string | null; position: number }[] = []
  const rawImages = Array.isArray(b.images) ? b.images : []
  if (rawImages.length > 0 && !ctx.scopes.includes("media:write")) {
    return fail("PERMISSION_DENIED", 'Submitting images requires the "media:write" permission')
  }
  if (rawImages.length > MAX_IMAGES) return fail("VALIDATION_ERROR", `At most ${MAX_IMAGES} images are allowed per product`)
  for (let i = 0; i < rawImages.length; i++) {
    const raw = rawImages[i] as Record<string, unknown>
    const url = typeof raw === "string" ? raw : typeof raw?.url === "string" ? raw.url : ""
    if (!url) continue
    const validated = await validateExtensionImageUrl(url)
    if ("ok" in validated && validated.ok === false) {
      return fail(validated.code, `Image ${i + 1}: ${validated.message}`)
    }
    images.push({
      url,
      altText: typeof (raw as Record<string, unknown>)?.altText === "string" ? sanitizeExtensionLine((raw as Record<string, unknown>).altText, 200) : null,
      position: i,
    })
  }

  const sourceUrl = typeof b.sourceUrl === "string" && b.sourceUrl.trim() ? b.sourceUrl.trim().slice(0, 2000) : null

  const specifications = JSON.stringify(
    Array.isArray(b.specifications)
      ? (b.specifications as unknown[])
          .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
          .map((s) => ({ k: sanitizeExtensionLine(s.k, 100), v: sanitizeExtensionLine(s.v, 300) }))
          .filter((s) => s.k || s.v)
      : []
  )
  const attributes = JSON.stringify(
    b.attributes && typeof b.attributes === "object" && !Array.isArray(b.attributes) ? b.attributes : {}
  )
  const tags = Array.isArray(b.tags)
    ? (b.tags as unknown[]).map((t) => sanitizeExtensionLine(t, 60)).filter(Boolean).join(", ")
    : sanitizeExtensionLine(b.tags, 500)

  return {
    ok: true,
    warnings,
    data: {
      title,
      slug,
      description: sanitizeExtensionText(b.description),
      specifications,
      attributes,
      tags,
      price: price as number,
      compareAtPrice: compareAtPrice ?? null,
      stockQuantity: stockQuantity ?? 0,
      sku,
      status,
      categoryId,
      brandId,
      sourceUrl,
      images,
    },
  }
}
