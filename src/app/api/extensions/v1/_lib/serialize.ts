import { safeJsonParse } from "@/lib/utils"
import type { Product, ProductImage, Category, Brand } from "@prisma/client"

type FullProduct = Product & {
  images?: ProductImage[]
  category?: Category | null
  brand?: Brand | null
}

/** The Product schema documented in EXTENSION_API.md — stable, additive-only across v1. */
export function serializeExtensionProduct(p: FullProduct) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    specifications: safeJsonParse(p.specifications, []),
    attributes: safeJsonParse(p.attributes, {}),
    tags: p.tags,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
    currency: p.currency,
    stockQuantity: p.stockQuantity,
    sku: p.sku,
    status: p.status,
    source: p.source,
    sourceUrl: p.sourceUrl,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
    images: (p.images ?? []).map((i) => ({ url: i.url, altText: i.altText, position: i.position })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}
