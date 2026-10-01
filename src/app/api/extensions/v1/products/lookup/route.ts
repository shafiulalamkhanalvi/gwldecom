import { db } from "@/lib/db"
import { extensionRoute, preflight } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/extensions/v1/products/lookup?sourceUrl=...   or ?sku=...   or ?slug=...
// Requires products:read. Lets an importer check for an existing product
// before deciding whether to create or update — the same check POST
// /api/extensions/v1/import performs internally, exposed standalone so an
// extension can short-circuit without building a full import payload.
export const GET = extensionRoute({ scope: "products:read" }, async (req) => {
  const sp = req.nextUrl.searchParams
  const sourceUrl = sp.get("sourceUrl")?.trim()
  const sku = sp.get("sku")?.trim()
  const slug = sp.get("slug")?.trim()

  if (!sourceUrl && !sku && !slug) {
    return extFail("VALIDATION_ERROR", "Provide at least one of: sourceUrl, sku, slug")
  }

  const product = await db.product.findFirst({
    where: {
      OR: [
        ...(sourceUrl ? [{ sourceUrl }] : []),
        ...(sku ? [{ sku }] : []),
        ...(slug ? [{ slug }] : []),
      ],
    },
    select: { id: true, slug: true, sku: true, sourceUrl: true, status: true, updatedAt: true },
  })

  return extOk({ found: !!product, product: product ?? null })
})

export const OPTIONS = preflight
