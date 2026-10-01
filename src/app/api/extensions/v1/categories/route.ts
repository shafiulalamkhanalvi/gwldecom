import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { sanitizeExtensionLine } from "@/lib/extensions/sanitize"
import { extensionRoute, preflight } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/extensions/v1/categories?search= — requires categories:read
export const GET = extensionRoute({ scope: "categories:read" }, async (req) => {
  const search = req.nextUrl.searchParams.get("search")?.trim()
  const categories = await db.category.findMany({
    where: search ? { name: { contains: search } } : undefined,
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: "asc" },
    take: 200,
  })
  return extOk({ items: categories })
})

// POST /api/extensions/v1/categories — find-or-create by name. Requires categories:write.
export const POST = extensionRoute({ scope: "categories:write" }, async (req) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return extFail("INVALID_PAYLOAD", "Request body must be valid JSON")
  }
  const name = sanitizeExtensionLine((body as Record<string, unknown>)?.name, 150)
  if (!name) return extFail("VALIDATION_ERROR", "`name` is required")

  const existing = await db.category.findFirst({ where: { name } })
  if (existing) return extOk({ category: existing, created: false })

  const category = await db.category.create({ data: { name, slug: slugify(name) || `category-${Date.now()}` } })
  return extOk({ category, created: true }, 201)
})

export const OPTIONS = preflight
