import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

// GET /api/admin/categories — full tree with product counts
export async function GET() {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true, children: true } } },
  })

  return ok({ items: categories })
}

// POST /api/admin/categories — create
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

  const name = String(body?.name ?? "").trim()
  if (!name) return fail("Name is required")
  const slug = String(body?.slug ?? "").trim() || slugify(name)
  if (!slug) return fail("Slug is required")

  const parentId = body?.parentId ? String(body.parentId) : null
  if (parentId) {
    const parent = await db.category.findUnique({ where: { id: parentId } })
    if (!parent) return fail("Parent category not found")
  }

  const existingSlug = await db.category.findUnique({ where: { slug } })
  if (existingSlug) return fail(`Slug "${slug}" is already in use`, 409)

  const category = await db.category.create({
    data: {
      name,
      slug,
      parentId,
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
    },
  })

  await audit({
    actorId: user.id,
    action: "category.create",
    entityType: "Category",
    entityId: category.id,
    metadata: { name, slug, parentId },
  })

  return ok({ id: category.id, slug: category.slug }, 201)
}
