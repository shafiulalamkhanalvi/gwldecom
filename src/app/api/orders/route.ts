import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 })
  try {
    const body = await req.json()
    const items: { productId: string; quantity: number }[] = body.items || []
    if (!items.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    let coupon: any = null; let discount = 0
    if (body.couponCode) {
      coupon = await db.coupon.findUnique({ where: { code: String(body.couponCode).toUpperCase() } })
      if (!coupon || !coupon.active) throw new Error("Invalid coupon")
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Coupon expired")
    }
    let subtotal = 0
    const lineItems: { productId: string; quantity: number; unitPrice: number }[] = []
    for (const it of items) {
      const product = await db.product.findUnique({ where: { id: it.productId } })
      if (!product) throw new Error("Product not found")
      if (product.status !== "published") throw new Error(`${product.title} is not available`)
      if (product.stockQuantity < it.quantity) throw new Error(`Only ${product.stockQuantity} of ${product.title} left`)
      subtotal += Number(product.price) * it.quantity
      lineItems.push({ productId: product.id, quantity: it.quantity, unitPrice: Number(product.price) })
      await db.product.update({ where: { id: product.id }, data: { stockQuantity: { decrement: it.quantity } } })
    }
    if (coupon) {
      if (subtotal < Number(coupon.minOrderAmount)) throw new Error(`Minimum order ৳${coupon.minOrderAmount} required`)
      discount = coupon.type === "percentage" ? Math.round((subtotal * Number(coupon.value)) / 100) : Number(coupon.value)
      if (discount > subtotal) discount = subtotal
      await db.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
    }
    const total = subtotal - discount
    const order = await db.order.create({ data: { customerId: user.id, status: "pending", paymentMethod: body.paymentMethod || "cod", paymentStatus: "unpaid", total, shippingAddress: JSON.stringify({ fullName: body.fullName, phone: body.phone, addressLine1: body.addressLine1, city: body.city, district: body.district, postalCode: body.postalCode }), items: { create: lineItems } }, include: { items: true } })
    return NextResponse.json({ ok: true, orderId: order.id, total })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Order failed"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const orders = await db.order.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" }, include: { items: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } } })
  return NextResponse.json({ orders })
}
