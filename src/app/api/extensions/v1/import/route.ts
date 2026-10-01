import { db } from "@/lib/db"
import { extensionRoute, preflight, logExtensionActivity } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"
import { serializeExtensionProduct } from "@/app/api/extensions/v1/_lib/serialize"
import { resolveProductInput } from "@/app/api/extensions/v1/_lib/product-input"
import { emitStoreEvent } from "@/lib/extensions/events"
import { RATE_LIMITS } from "@/lib/extensions/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INCLUDE = { category: true, brand: true, images: { orderBy: { position: "asc" as const } } }

/**
 * POST /api/extensions/v1/import
 *
 * The dedicated import workflow: Product Importer (and future Supplier
 * Importer / Bulk Product Importer style extensions) call this instead of
 * manipulating tables directly. Requires both "imports:write" (marks this
 * connection as an import-capable client, for auditing/activity purposes)
 * and "products:write" (the underlying capability actually being used).
 *
 * Pipeline, in order — matches EXTENSION_API.md "Import pipeline":
 *   1. auth + scope check                (extensionRoute wrapper)
 *   2. payload validation + sanitization  (resolveProductInput)
 *   3. duplicate check by sourceUrl       (below)
 *   4. category/brand resolution          (resolveProductInput)
 *   5. image validation (SSRF + sniff)    (resolveProductInput -> media.ts)
 *   6. create OR update                   (below)
 *   7. import activity record             (below, always — success or failure)
 */
export const POST = extensionRoute({ scope: "imports:write", rateLimit: RATE_LIMITS.imports }, async (req, ctx) => {
  if (!ctx.scopes.includes("products:write")) {
    return extFail("PERMISSION_DENIED", 'Importing products also requires the "products:write" permission')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return extFail("INVALID_PAYLOAD", "Request body must be valid JSON")
  }

  const sourceUrl = typeof (body as Record<string, unknown>)?.sourceUrl === "string" ? ((body as Record<string, unknown>).sourceUrl as string).trim() : null

  const resolved = await resolveProductInput(ctx, body)
  if (!resolved.ok) {
    await logExtensionActivity({
      extensionId: ctx.extension.id,
      connectionId: ctx.connection.id,
      userId: ctx.user.id,
      action: "product.import",
      sourceUrl,
      status: "error",
      errorCode: resolved.code,
    })
    return resolved.response
  }
  const { data, warnings } = resolved

  // Duplicate detection: sourceUrl is the primary signal an importer cares
  // about ("have I already imported this exact page?") — when present and
  // it matches an existing product, this becomes an update instead of a
  // create rather than failing outright, since re-running an import to
  // refresh price/stock is the common case. sourceUrl-less payloads fall
  // back to slug/sku collision checks only.
  const existingBySource = data.sourceUrl ? await db.product.findFirst({ where: { sourceUrl: data.sourceUrl } }) : null

  if (!existingBySource) {
    const [slugTaken, skuTaken] = await Promise.all([
      db.product.findUnique({ where: { slug: data.slug } }),
      db.product.findUnique({ where: { sku: data.sku } }),
    ])
    const clash = slugTaken ?? skuTaken
    if (clash) {
      await logExtensionActivity({
        extensionId: ctx.extension.id,
        connectionId: ctx.connection.id,
        userId: ctx.user.id,
        action: "product.import",
        sourceUrl: data.sourceUrl,
        productId: clash.id,
        status: "error",
        errorCode: "DUPLICATE_PRODUCT",
      })
      return extFail("DUPLICATE_PRODUCT", `A product with this ${slugTaken ? "slug" : "SKU"} already exists`, { productId: clash.id })
    }
  }

  const product = existingBySource
    ? await db.product.update({
        where: { id: existingBySource.id },
        data: {
          title: data.title,
          description: data.description,
          specifications: data.specifications,
          attributes: data.attributes,
          tags: data.tags,
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          stockQuantity: data.stockQuantity,
          categoryId: data.categoryId,
          brandId: data.brandId,
          ...(data.images.length ? { images: { deleteMany: {}, create: data.images } } : {}),
        },
        include: INCLUDE,
      })
    : await db.product.create({
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

  const status = existingBySource ? "updated" : "created"
  emitStoreEvent(existingBySource ? "product.updated" : "product.created", product.id, { via: ctx.extension.id, import: true })

  await logExtensionActivity({
    extensionId: ctx.extension.id,
    connectionId: ctx.connection.id,
    userId: ctx.user.id,
    action: "product.import",
    sourceUrl: data.sourceUrl,
    productId: product.id,
    status: "success",
  })

  return extOk(
    {
      productId: product.id,
      status,
      message: existingBySource ? "Existing product updated from import" : "Product imported successfully",
      product: serializeExtensionProduct(product),
      warnings,
    },
    existingBySource ? 200 : 201
  )
})

export const OPTIONS = preflight
