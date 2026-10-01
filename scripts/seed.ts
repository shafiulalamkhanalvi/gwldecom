import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
const db = new PrismaClient()
const img = (id: string, w = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

async function main() {
  console.log("🌱 Seeding ShopHaat…")
  const adminPass = await bcrypt.hash("admin123", 10)
  const customerPass = await bcrypt.hash("customer123", 10)
  const admin = await db.user.upsert({ where: { email: "admin@shophaat.com" }, update: {}, create: { email: "admin@shophaat.com", passwordHash: adminPass, fullName: "Store Admin", role: "admin", phone: "+8801710000001" } })
  const customer = await db.user.upsert({ where: { email: "customer@shophaat.com" }, update: {}, create: { email: "customer@shophaat.com", passwordHash: customerPass, fullName: "Rahim Ahmed", role: "customer", phone: "+8801710000003" } })
  console.log("  users created")

  const cats = [
    { name: "Electronics", slug: "electronics", image: img("photo-1498049794561-7780e7231661") },
    { name: "Fashion", slug: "fashion", image: img("photo-1483985988355-763728e1935b") },
    { name: "Home & Kitchen", slug: "home-kitchen", image: img("photo-1556909114-f6e7ad7d3136") },
    { name: "Beauty & Health", slug: "beauty-health", image: img("photo-1556228720-195a672e8a03") },
    { name: "Sports & Fitness", slug: "sports-fitness", image: img("photo-1517649763962-0c623066013b") },
    { name: "Toys & Baby", slug: "toys-baby", image: img("photo-1558877385-8c1cee0c2b06") },
  ]
  const subcats = [
    { name: "Smartphones", slug: "smartphones", parent: "electronics", image: img("photo-1511707171634-5f897ff02aa9") },
    { name: "Laptops", slug: "laptops", parent: "electronics", image: img("photo-1496181133206-80ce9b88a853") },
    { name: "Audio", slug: "audio", parent: "electronics", image: img("photo-1505740420928-5e560c06d30e") },
    { name: "Men's Wear", slug: "mens-wear", parent: "fashion", image: img("photo-1490578474895-699cd4e2cf59") },
    { name: "Women's Wear", slug: "womens-wear", parent: "fashion", image: img("photo-1485462537746-965f33f7f6a7") },
    { name: "Footwear", slug: "footwear", parent: "fashion", image: img("photo-1542291026-7eec264c27ff") },
  ]
  const catMap: Record<string, string> = {}
  for (const c of cats) { const r = await db.category.create({ data: { name: c.name, slug: c.slug, imageUrl: c.image } }); catMap[c.slug] = r.id }
  for (const s of subcats) { const r = await db.category.create({ data: { name: s.name, slug: s.slug, parentId: catMap[s.parent], imageUrl: s.image } }); catMap[s.slug] = r.id }
  console.log("  categories:", Object.keys(catMap).length)

  const brands = [
    { name: "Samsung", slug: "samsung", logo: img("photo-1610945265064-0e34e5519bbf") },
    { name: "Xiaomi", slug: "xiaomi", logo: img("photo-1606220838315-056192d5e927") },
    { name: "Apple", slug: "apple", logo: img("photo-1611532736597-de2d4265fba3") },
    { name: "Walton", slug: "walton", logo: img("photo-1593359677879-a4bb92f829d1") },
    { name: "Sony", slug: "sony", logo: img("photo-1505740420928-5e560c06d30e") },
    { name: "Nike", slug: "nike", logo: img("photo-1542291026-7eec264c27ff") },
    { name: "Philips", slug: "philips", logo: img("photo-1574269909862-7e1d70bb8078") },
  ]
  const brandMap: Record<string, string> = {}
  for (const b of brands) { const r = await db.brand.create({ data: { name: b.name, slug: b.slug, logoUrl: b.logo } }); brandMap[b.slug] = r.id }

  type P = { title: string; slug: string; desc: string; cat: string; brand?: string; price: number; compareAt?: number; stock: number; sku: string; tags: string; specs: [string,string][]; attrs?: Record<string,string[]>; images: string[] }
  const products: P[] = [
    { title: "Samsung Galaxy A55 5G (8GB/256GB)", slug: "samsung-galaxy-a55-5g", desc: "The Samsung Galaxy A55 5G brings premium design with a glass back and metal frame, a vibrant 6.6-inch Super AMOLED display, 50MP OIS camera, and a long-lasting 5000mAh battery.", cat: "smartphones", brand: "samsung", price: 42999, compareAt: 46999, stock: 38, sku: "SM-A55-256", tags: "smartphone,5g,samsung", specs: [["Display","6.6\" Super AMOLED 120Hz"],["Processor","Exynos 1480"],["RAM","8GB"],["Storage","256GB"],["Battery","5000mAh"],["Camera","50MP+12MP+5MP"]], attrs: { Color: ["Navy Blue","Iceblue","Lilac"] }, images: [img("photo-1610945265064-0e34e5519bbf"),img("photo-1598327105666-5b89351aff97")] },
    { title: "Xiaomi Redmi Note 13 Pro (8GB/256GB)", slug: "xiaomi-redmi-note-13-pro", desc: "Stunning 200MP camera, 1.5K AMOLED display, and 67W turbo charging.", cat: "smartphones", brand: "xiaomi", price: 31999, compareAt: 34999, stock: 52, sku: "XM-RN13-256", tags: "smartphone,5g,xiaomi", specs: [["Display","6.67\" AMOLED 1.5K"],["Processor","Snapdragon 7s Gen 2"],["RAM","8GB"],["Camera","200MP"]], attrs: { Color: ["Midnight Black","Aurora Purple"] }, images: [img("photo-1598327105666-5b89351aff97"),img("photo-1511707171634-5f897ff02aa9")] },
    { title: "Apple iPhone 15 (128GB)", slug: "apple-iphone-15-128gb", desc: "Dynamic island, 48MP main camera with 2x telephoto, USB-C, and the A16 Bionic chip.", cat: "smartphones", brand: "apple", price: 129999, compareAt: 139999, stock: 18, sku: "AP-IP15-128", tags: "smartphone,5g,apple", specs: [["Display","6.1\" Super Retina XDR"],["Chip","A16 Bionic"],["Camera","48MP+12MP"],["Port","USB-C"]], attrs: { Color: ["Black","Blue","Pink","Green"] }, images: [img("photo-1696446702183-be7c33121d54"),img("photo-1592286927505-1def25115558")] },
    { title: "MacBook Air M2 13\" (256GB)", slug: "macbook-air-m2-13", desc: "Strikingly thin and fast. The M2 chip delivers exceptional performance with all-day battery life.", cat: "laptops", brand: "apple", price: 119999, compareAt: 129999, stock: 12, sku: "AP-MBA-M2-256", tags: "laptop,macbook,apple", specs: [["Display","13.6\" Liquid Retina"],["Chip","Apple M2"],["Memory","8GB"],["Storage","256GB SSD"]], images: [img("photo-1517336714731-489689fd1ca8"),img("photo-1611186871348-b1ce696e52c9")] },
    { title: "Sony WH-1000XM5 Wireless Headphones", slug: "sony-wh-1000xm5", desc: "Industry-leading noise cancellation with crystal-clear hands-free calling and 30-hour battery life.", cat: "audio", brand: "sony", price: 39999, compareAt: 44999, stock: 30, sku: "SN-WH1000XM5", tags: "audio,headphones,sony", specs: [["Type","Over-ear wireless"],["ANC","Industry-leading"],["Battery","30 hours"]], attrs: { Color: ["Black","Silver"] }, images: [img("photo-1505740420928-5e560c06d30e"),img("photo-1583394838336-acd977736f90")] },
    { title: "JBL Tune 510BT Wireless Headphones", slug: "jbl-tune-510bt", desc: "JBL Pure Bass sound, 40-hour battery, and foldable design.", cat: "audio", brand: "sony", price: 5499, compareAt: 7999, stock: 80, sku: "JBL-T510BT", tags: "audio,headphones,jbl", specs: [["Type","On-ear wireless"],["Battery","40 hours"]], images: [img("photo-1484704849700-f032a568e944"),img("photo-1577174881658-0f30fa60a89f")] },
    { title: "Men's Slim Fit Cotton Casual Shirt", slug: "mens-slim-fit-casual-shirt", desc: "Breathable 100% cotton shirt with a modern slim fit.", cat: "mens-wear", price: 1299, compareAt: 1999, stock: 120, sku: "MW-SHIRT-001", tags: "fashion,men,shirt,cotton", specs: [["Material","100% Cotton"],["Fit","Slim Fit"]], attrs: { Size: ["S","M","L","XL","XXL"], Color: ["White","Sky Blue","Navy"] }, images: [img("photo-1596755094514-f87e34085b2c"),img("photo-1602810318383-e386cc2a3ccf")] },
    { title: "Women's Embroidered Kurti", slug: "womens-embroidered-kurti", desc: "Elegant embroidered kurti in soft rayon fabric.", cat: "womens-wear", price: 1599, compareAt: 2499, stock: 95, sku: "WW-KURTI-001", tags: "fashion,women,kurti", specs: [["Material","Rayon"],["Length","44 inch"]], attrs: { Size: ["S","M","L","XL"], Color: ["Maroon","Teal","Mustard"] }, images: [img("photo-1583391733956-6c78276477e2"),img("photo-1591369822096-ffd140ec948f")] },
    { title: "Nike Revolution 6 Running Shoes", slug: "nike-revolution-6-running", desc: "Lightweight running shoes with soft foam midsole.", cat: "footwear", brand: "nike", price: 6499, compareAt: 8499, stock: 60, sku: "NK-REV6-001", tags: "fashion,shoes,nike,running", specs: [["Upper","Mesh"],["Sole","Rubber"]], attrs: { Size: ["6","7","8","9","10","11"], Color: ["Black","Grey","Red"] }, images: [img("photo-1542291026-7eec264c27ff"),img("photo-1460353581641-37baddab0fa2")] },
    { title: "Non-Stick Cookware Set (8 Piece)", slug: "nonstick-cookware-set-8pc", desc: "Premium non-stick 8-piece cookware set with even heat distribution.", cat: "home-kitchen", price: 4999, compareAt: 7999, stock: 40, sku: "CW-SET8-001", tags: "kitchen,cookware,nonstick", specs: [["Pieces","8"],["Coating","Non-stick PFOA-free"]], images: [img("photo-1556909114-f6e7ad7d3136"),img("photo-1584990347449-a424d1c1de9b")] },
    { title: "Philips Air Fryer 4.1L HD9252", slug: "philips-air-fryer-41l", desc: "Rapid Air technology cooks with little to no oil.", cat: "home-kitchen", brand: "philips", price: 12999, compareAt: 15999, stock: 28, sku: "PH-AF-HD9252", tags: "appliance,airfryer,kitchen", specs: [["Capacity","4.1L"],["Power","1400W"]], images: [img("photo-1574269909862-7e1d70bb8078"),img("photo-1626806787463-566c1b1c3f11")] },
    { title: "Walton 50\" 4K Smart LED TV", slug: "walton-50-4k-smart-tv", desc: "Crystal-clear 4K UHD with HDR, built-in apps, and Dolby Audio.", cat: "electronics", brand: "walton", price: 54999, compareAt: 62999, stock: 20, sku: "WL-TV50-4K", tags: "electronics,tv,4k,smart", specs: [["Display","50\" 4K UHD"],["HDR","Yes"],["OS","Android TV"]], images: [img("photo-1593359677879-a4bb92f829d1"),img("photo-1601944179066-29686c4c454b")] },
    { title: "Bluetooth Smart Watch with Heart Rate", slug: "bluetooth-smart-watch-hr", desc: "Track heart rate, SpO2, sleep, and 100+ sport modes. 1.8\" HD display with 7-day battery life.", cat: "electronics", brand: "xiaomi", price: 2999, compareAt: 4999, stock: 110, sku: "EL-SWATCH-HR", tags: "electronics,watch,smart,fitness", specs: [["Display","1.8\" HD"],["Battery","7 days"],["Water Resistance","IP68"]], attrs: { Color: ["Black","Rose Gold","Silver"] }, images: [img("photo-1523275335684-37898b6baf30"),img("photo-1546868871-7041f2a55e12")] },
    { title: "Stainless Steel Water Bottle 1L", slug: "stainless-steel-water-bottle-1l", desc: "Double-wall vacuum insulated bottle keeps drinks cold for 24h or hot for 12h.", cat: "home-kitchen", price: 899, compareAt: 1299, stock: 200, sku: "HK-BOTTLE-1L", tags: "home,kitchen,bottle,steel", specs: [["Capacity","1L"],["Insulation","Double wall"],["Material","304 Steel"]], attrs: { Color: ["Black","Silver","Teal"] }, images: [img("photo-1602143407151-7111542de6e8"),img("photo-1610824352934-c10d87b700cc")] },
    { title: "Yoga Mat Premium 6mm Anti-Slip", slug: "yoga-mat-premium-6mm", desc: "Eco-friendly TPE yoga mat with double-sided anti-slip texture.", cat: "sports-fitness", brand: "nike", price: 1299, compareAt: 1999, stock: 70, sku: "SF-YOGA-6MM", tags: "sports,fitness,yoga,mat", specs: [["Thickness","6mm"],["Material","TPE"],["Size","183x61cm"]], images: [img("photo-1517649763962-0c623066013b"),img("photo-1599447421416-3414500d18a5")] },
    { title: "Building Blocks Castle Set (500pc)", slug: "building-blocks-castle-500pc", desc: "Spark creativity with this 500-piece building block castle set.", cat: "toys-baby", price: 2499, compareAt: 3999, stock: 90, sku: "TB-BLOCKS-500", tags: "toys,baby,blocks,kids", specs: [["Pieces","500"],["Age","6+"]], images: [img("photo-1558877385-8c1cee0c2b06"),img("photo-1587654780291-39c9404d746b")] },
  ]
  for (const p of products) {
    const created = await db.product.create({ data: { title: p.title, slug: p.slug, description: p.desc, specifications: JSON.stringify(p.specs.map(([k,v])=>({k,v}))), attributes: JSON.stringify(p.attrs ?? {}), tags: p.tags, categoryId: catMap[p.cat], brandId: p.brand ? brandMap[p.brand] : null, price: p.price, compareAtPrice: p.compareAt ?? null, stockQuantity: p.stock, sku: p.sku, status: "published", source: "manual", createdById: admin.id } })
    await db.productImage.createMany({ data: p.images.map((url, i) => ({ productId: created.id, url, altText: p.title, position: i })) })
  }
  console.log("  products:", products.length)

  const banners = [
    { title: "Mega Electronics Sale", image: img("photo-1498049794561-7780e7231661", 1400), link: "/category/electronics", position: 0 },
    { title: "Fashion Fiesta — Up to 50% Off", image: img("photo-1483985988355-763728e1935b", 1400), link: "/category/fashion", position: 1 },
    { title: "Home & Kitchen Essentials", image: img("photo-1556909114-f6e7ad7d3136", 1400), link: "/category/home-kitchen", position: 2 },
    { title: "Smart Watches New Arrivals", image: img("photo-1523275335684-37898b6baf30", 1400), link: "/search?q=smart+watch", position: 3 },
  ]
  for (const b of banners) await db.banner.create({ data: { title: b.title, imageUrl: b.image, linkUrl: b.link, position: b.position, active: true } })

  await db.coupon.createMany({ data: [
    { code: "SAVE10", type: "percentage", value: 10, minOrderAmount: 1000, maxUses: 1000, active: true },
    { code: "FLAT200", type: "fixed", value: 200, minOrderAmount: 2000, maxUses: 1000, active: true },
    { code: "MEGA500", type: "fixed", value: 500, minOrderAmount: 5000, maxUses: 500, active: true },
  ] })

  await db.address.create({ data: { userId: customer.id, label: "Home", fullName: "Rahim Ahmed", phone: "+8801710000003", addressLine1: "House 12, Road 5", city: "Dhaka", district: "Dhaka", postalCode: "1212", isDefault: true } })

  console.log("✅ Seed complete")
  console.log("   admin@shophaat.com / admin123")
  console.log("   customer@shophaat.com / customer123")
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
