import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { sanitizeExtensionLine } from "@/lib/extensions/sanitize"
import { extensionRoute, preflight } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/extensions/v1/brands?search= — requires brands:read
export const GET = extensionRoute({ scope: "brands:read" }, async (req) => {
  const search = req.nextUrl.searchParams.get("search")?.trim()
  const brands = await db.brand.findMany({
    where: search ? { name: { contains: search } } : undefined,
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
    take: 200,
  })
  return extOk({ items: brands })
})

// POST /api/extensions/v1/brands — find-or-create by name. Requires brands:write.
export const POST = extensionRoute({ scope: "brands:write" }, async (req) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return extFail("INVALID_PAYLOAD", "Request body must be valid JSON")
  }
  const name = sanitizeExtensionLine((body as Record<string, unknown>)?.name, 150)
  if (!name) return extFail("VALIDATION_ERROR", "`name` is required")

  const existing = await db.brand.findFirst({ where: { name } })
  if (existing) return extOk({ brand: existing, created: false })

  const brand = await db.brand.create({ data: { name, slug: slugify(name) || `brand-${Date.now()}` } })
  return extOk({ brand, created: true }, 201)
})

export const OPTIONS = preflight
