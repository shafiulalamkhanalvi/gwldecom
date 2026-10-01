import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { guardAdmin, ok, fail } from "@/app/api/admin/_lib/session"
import { audit } from "@/app/api/admin/_lib/audit"

export const dynamic = "force-dynamic"

// GET /api/admin/brands
export async function GET() {
  const guard = await guardAdmin()
  if (guard instanceof Response) return guard

  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  })

  return ok({ items: brands })
}

// POST /api/admin/brands
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

  const existing = await db.brand.findUnique({ where: { slug } })
  if (existing) return fail(`Slug "${slug}" is already in use`, 409)

  const brand = await db.brand.create({
    data: {
      name,
      slug,
      logoUrl: body?.logoUrl ? String(body.logoUrl) : null,
    },
  })

  await audit({
    actorId: user.id,
    action: "brand.create",
    entityType: "Brand",
    entityId: brand.id,
    metadata: { name, slug },
  })

  return ok({ id: brand.id, slug: brand.slug }, 201)
}
