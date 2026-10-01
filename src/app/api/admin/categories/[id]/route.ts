import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// PUT /api/admin/categories/[id]
export async function PUT(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) return fail("Category not found", 404)

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
  if (parentId === id) return fail("A category cannot be its own parent")
  if (parentId) {
    if (parentId === id) return fail("A category cannot be its own parent")
    const parent = await db.category.findUnique({ where: { id: parentId } })
    if (!parent) return fail("Parent category not found")
    // prevent making a category a child of its own descendant
    let cursor: string | null = parentId
    const guardSeen = new Set<string>()
    while (cursor) {
      if (cursor === id) return fail("Cannot move a category under one of its own descendants")
      if (guardSeen.has(cursor)) break
      guardSeen.add(cursor)
      const c = await db.category.findUnique({ where: { id: cursor }, select: { parentId: true } })
      cursor = c?.parentId ?? null
    }
  }

  if (slug !== existing.slug) {
    const clash = await db.category.findUnique({ where: { slug } })
    if (clash) return fail(`Slug "${slug}" is already in use`, 409)
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      name,
      slug,
      parentId,
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
    },
  })

  await audit({
    actorId: user.id,
    action: "category.update",
    entityType: "Category",
    entityId: id,
    metadata: { name, slug, parentId },
  })

  return ok({ id: updated.id, slug: updated.slug })
}

// DELETE /api/admin/categories/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.category.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  })
  if (!existing) return fail("Category not found", 404)

  const childCount = await db.category.count({ where: { parentId: id } })
  if (childCount > 0) return fail("Cannot delete a category that still has child categories. Move or delete them first.", 409)

  const productCount = await db.product.count({ where: { categoryId: id } })
  if (productCount > 0) return fail(`Cannot delete: ${productCount} product(s) are assigned to this category. Reassign them first.`, 409)

  await db.category.delete({ where: { id } })
  await audit({
    actorId: user.id,
    action: "category.delete",
    entityType: "Category",
    entityId: id,
    metadata: { name: existing.name, slug: existing.slug },
  })

  return ok({ deleted: true })
}
