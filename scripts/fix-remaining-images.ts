import sharp from 'sharp'
import { db } from '../src/lib/db'

const OUT = 'public/uploads/generated'

const BANNERS = [
  { slug: 'banner-electronics', title: 'Mega Electronics Sale', hue: 210 },
  { slug: 'banner-fashion', title: 'New Fashion Arrivals', hue: 340 },
  { slug: 'banner-home-kitchen', title: 'Home & Kitchen Deals', hue: 30 },
]

async function main() {
  // 1. Generate banner PNGs (wide 1440x720)
  for (const b of BANNERS) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="720">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${b.hue},70%,55%)"/>
        <stop offset="100%" stop-color="hsl(${(b.hue + 40) % 360},65%,35%)"/>
      </linearGradient></defs>
      <rect width="1440" height="720" fill="url(#g)"/>
      <text x="720" y="380" font-family="sans-serif" font-size="48" font-weight="700" fill="white" text-anchor="middle">${b.title.replace(/&/g, '&amp;')}</text>
      <text x="720" y="430" font-family="sans-serif" font-size="20" fill="white" opacity="0.8" text-anchor="middle">BDShop</text>
    </svg>`
    await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${b.slug}.png`)
    console.log(`generated banner: ${b.slug}.png`)
  }

  // 2. Update banner imageUrls in DB
  const banners = await db.banner.findMany()
  for (const b of banners) {
    if (b.imageUrl.startsWith('data:image/svg')) {
      const match = BANNERS.find(bl => b.title.includes(bl.title.split(' ')[0]) || b.title.toLowerCase().includes(bl.slug.replace('banner-', '')))
      const slug = match?.slug || `banner-${b.title.toLowerCase().split(' ')[0]}`
      const url = `/uploads/generated/${slug}.png`
      await db.banner.update({ where: { id: b.id }, data: { imageUrl: url } })
      console.log(`updated banner: ${b.title} -> ${url}`)
    }
  }

  // 3. Delete CSV-imported test products that have no images
  const noImgProducts = await db.product.findMany({
    where: { images: { none: {} }, title: { contains: 'CSV' } },
    select: { id: true, title: true },
  })
  for (const p of noImgProducts) {
    await db.product.delete({ where: { id: p.id } })
    console.log(`deleted: ${p.title}`)
  }

  console.log('done')
}
main().catch((e) => { console.error(e); process.exit(1) })
