import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// PUT /api/admin/brands/[id]
export async function PUT(req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.brand.findUnique({ where: { id } })
  if (!existing) return fail("Brand not found", 404)

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

  if (slug !== existing.slug) {
    const clash = await db.brand.findUnique({ where: { slug } })
    if (clash) return fail(`Slug "${slug}" is already in use`, 409)
  }

  const updated = await db.brand.update({
    where: { id },
    data: {
      name,
      slug,
      logoUrl: body?.logoUrl ? String(body.logoUrl) : null,
    },
  })

  await audit({
    actorId: user.id,
    action: "brand.update",
    entityType: "Brand",
    entityId: id,
    metadata: { name, slug },
  })

  return ok({ id: updated.id, slug: updated.slug })
}

// DELETE /api/admin/brands/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard
  const user = guard

  const { id } = await params
  const existing = await db.brand.findUnique({ where: { id }, select: { id: true, name: true, slug: true } })
  if (!existing) return fail("Brand not found", 404)

  const productCount = await db.product.count({ where: { brandId: id } })
  if (productCount > 0) {
    // detach brand from products instead of blocking
    await db.product.updateMany({ where: { brandId: id }, data: { brandId: null } })
    await db.brand.delete({ where: { id } })
    await audit({
      actorId: user.id,
      action: "brand.delete",
      entityType: "Brand",
      entityId: id,
      metadata: { name: existing.name, slug: existing.slug, detachedProducts: productCount },
    })
    return ok({ deleted: true, detachedProducts: productCount })
  }

  await db.brand.delete({ where: { id } })
  await audit({
    actorId: user.id,
    action: "brand.delete",
    entityType: "Brand",
    entityId: id,
    metadata: { name: existing.name, slug: existing.slug },
  })

  return ok({ deleted: true })
}
