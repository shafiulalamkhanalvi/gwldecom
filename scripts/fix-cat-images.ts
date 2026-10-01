import sharp from 'sharp'
import { db } from '../src/lib/db'

const OUT = 'public/uploads/generated'

const CATS = [
  { slug: 'electronics', name: 'Electronics', hue: 210 },
  { slug: 'fashion', name: 'Fashion', hue: 340 },
  { slug: 'home-kitchen', name: 'Home & Kitchen', hue: 30 },
  { slug: 'beauty', name: 'Beauty', hue: 320 },
]

async function main() {
  for (const c of CATS) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${c.hue},65%,55%)"/>
        <stop offset="100%" stop-color="hsl(${(c.hue + 40) % 360},60%,38%)"/>
      </linearGradient></defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <text x="200" y="210" font-family="sans-serif" font-size="28" font-weight="700" fill="white" text-anchor="middle">${c.name.replace(/&/g, '&amp;')}</text>
    </svg>`
    const out = `${OUT}/cat-${c.slug}.png`
    await sharp(Buffer.from(svg)).png().toFile(out)
    console.log(`generated: cat-${c.slug}.png`)
  }

  for (const c of CATS) {
    const cat = await db.category.findUnique({ where: { slug: c.slug } })
    if (cat) {
      await db.category.update({ where: { id: cat.id }, data: { imageUrl: `/uploads/generated/cat-${c.slug}.png` } })
      console.log(`updated DB: ${c.slug}`)
    }
  }
  console.log('done')
}
main().catch((e) => { console.error(e); process.exit(1) })
