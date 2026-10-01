import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"
const schema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(6), phone: z.string().optional() })
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 })
    const { email, password, fullName, phone } = parsed.data
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return NextResponse.json({ error: "Account already exists" }, { status: 409 })
    const hash = await bcrypt.hash(password, 10)
    await db.user.create({ data: { email: email.toLowerCase(), passwordHash: hash, fullName, phone: phone || null, role: "customer" } })
    return NextResponse.json({ ok: true })
  } catch (e) { console.error("[register]", e); return NextResponse.json({ error: "Registration failed" }, { status: 500 }) }
}
