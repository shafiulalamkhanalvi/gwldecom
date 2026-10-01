import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ items: [] })
  const items = await db.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } })
  return NextResponse.json({ items })
}
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 })
  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 })
  const existing = await db.wishlist.findUnique({ where: { userId_productId: { userId: user.id, productId } } })
  if (existing) { await db.wishlist.delete({ where: { id: existing.id } }); return NextResponse.json({ ok: true, state: "removed" }) }
  await db.wishlist.create({ data: { userId: user.id, productId } })
  return NextResponse.json({ ok: true, state: "added" })
}
