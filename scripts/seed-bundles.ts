import { db } from '../src/lib/db'

async function main() {
  const a55 = await db.product.findUnique({ where: { slug: 'samsung-galaxy-a55-5g-8gb128gb' } })
  const sony = await db.product.findUnique({ where: { slug: 'sony-wh-1000xm5-wireless-headphones' } })
  const logi = await db.product.findUnique({ where: { slug: 'logitech-mx-master-3s-wireless-mouse' } })
  if (!a55 || !sony || !logi) {
    console.log('missing products', !!a55, !!sony, !!logi)
    return
  }
  const existing = await db.bundleDeal.findUnique({ where: { slug: 'tech-essentials-bundle' } })
  if (!existing) {
    const bundle = await db.bundleDeal.create({
      data: {
        title: 'Tech Essentials Bundle',
        slug: 'tech-essentials-bundle',
        description: 'Phone + Headphones + Mouse — everything you need',
        discountPct: 15,
        active: true,
        items: { create: [{ productId: a55.id }, { productId: sony.id }, { productId: logi.id }] },
      },
    })
    console.log('created bundle:', bundle.slug)
  } else { console.log('bundle already exists') }

  const products = await db.product.findMany({ take: 5, select: { id: true, price: true, slug: true } })
  for (const p of products) {
    const existingHistory = await db.priceHistory.findFirst({ where: { productId: p.id } })
    if (existingHistory) { console.log(`skip ${p.slug}`); continue }
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const variance = 1 + (Math.random() * 0.1 - 0.05)
      await db.priceHistory.create({ data: { productId: p.id, price: Math.round(p.price * variance), compareAtPrice: i < 3 ? Math.round(p.price * 1.1) : null } })
      const latest = await db.priceHistory.findFirst({ where: { productId: p.id }, orderBy: { recordedAt: 'desc' } })
      if (latest) await db.priceHistory.update({ where: { id: latest.id }, data: { recordedAt: d } })
    }
    console.log(`seeded history for ${p.slug}`)
  }
  console.log('done')
}
main().catch((e) => { console.error(e); process.exit(1) })
