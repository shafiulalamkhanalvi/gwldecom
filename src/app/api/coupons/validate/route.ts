import { NextResponse } from "next/server"
import { db } from "@/lib/db"
export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json()
    if (!code) return NextResponse.json({ valid: false, message: "Enter a coupon code" }, { status: 400 })
    const coupon = await db.coupon.findUnique({ where: { code: String(code).toUpperCase() } })
    if (!coupon || !coupon.active) return NextResponse.json({ valid: false, message: "Invalid coupon code" })
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ valid: false, message: "Coupon expired" })
    const sub = Number(subtotal) || 0
    if (sub < Number(coupon.minOrderAmount)) return NextResponse.json({ valid: false, message: `Minimum order ৳${coupon.minOrderAmount} required` })
    let discount = coupon.type === "percentage" ? Math.round((sub * Number(coupon.value)) / 100) : Number(coupon.value)
    if (discount > sub) discount = sub
    return NextResponse.json({ valid: true, code: coupon.code, discount, message: `You save ৳${discount}!` })
  } catch { return NextResponse.json({ valid: false, message: "Failed" }, { status: 500 }) }
}
