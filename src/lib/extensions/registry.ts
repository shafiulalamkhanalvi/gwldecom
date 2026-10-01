import { db } from "@/lib/db"
import type { ExtensionScope } from "@/lib/extensions/scopes"

/**
 * Static manifest for an extension. This is code, not database rows — adding
 * a new extension to the platform means adding an entry here (and, usually,
 * implementing whatever new endpoint it needs under
 * src/app/api/extensions/v1/). The mutable parts of an extension's state
 * (enabled/disabled, connections, tokens, activity) live in the database and
 * are synced from this manifest on demand via `syncExtensionRegistry()`.
 *
 * This is the "Extension Registry" required by the integration layer: a
 * single place extensions are declared, instead of scattering extension
 * metadata across routes/components.
 */
export type ExtensionManifest = {
  /** Stable slug — becomes the Extension.id primary key. Never change once shipped. */
  id: string
  name: string
  description: string
  version: string
  developer: string
  apiVersion: "v1"
  /** Every scope this extension may ever request. Connections grant a subset of these. */
  permissions: ExtensionScope[]
  /**
   * Origins allowed to call the API for this extension via CORS, e.g.
   * "chrome-extension://abcdefghijklmnopabcdefghijklmnop". Populate this once
   * the Chrome extension's published/dev ID is known — see EXTENSION_API.md.
   */
  allowedOrigins: string[]
  /** Whether newly-registered instances of this extension start enabled. */
  defaultEnabled: boolean
}

export const EXTENSION_REGISTRY: ExtensionManifest[] = [
  {
    id: "product-importer",
    name: "Product Importer",
    description:
      "Chrome extension that imports products (title, price, images, specs) from a supplier or marketplace page directly into the catalogue.",
    version: "1.0.0",
    apiVersion: "v1",
    developer: "ShopHaat",
    permissions: ["products:read", "products:write", "categories:read", "categories:write", "brands:read", "brands:write", "media:write", "imports:write"],
    // TODO: replace with the real published/dev extension ID — see EXTENSION_API.md "CORS configuration".
    allowedOrigins: [],
    defaultEnabled: true,
  },
  // Future extensions (Supplier Importer, Price Monitor, Inventory Sync, SEO
  // Extension, Order Management Extension, ...) register here the same way.
  // The API surface (products/categories/brands/media/import/webhooks) is
  // already generic — most new extensions need only a new manifest entry
  // plus, if their use case isn't covered yet, a new route file.
]

export function getManifest(id: string): ExtensionManifest | undefined {
  return EXTENSION_REGISTRY.find((m) => m.id === id)
}

/**
 * Upserts every manifest into the Extension table so static metadata
 * (name/version/permissions/developer) always mirrors the code, while
 * preserving the DB-owned `enabled` flag once a row exists. Cheap
 * (single findMany-free upsert per manifest) and safe to call on every
 * admin extensions-page load — there's no separate "seed" step to remember.
 */
export async function syncExtensionRegistry() {
  for (const m of EXTENSION_REGISTRY) {
    await db.extension.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name,
        description: m.description,
        version: m.version,
        developer: m.developer,
        apiVersion: m.apiVersion,
        permissions: JSON.stringify(m.permissions),
        allowedOrigins: JSON.stringify(m.allowedOrigins),
        enabled: m.defaultEnabled,
      },
      update: {
        // enabled intentionally omitted — admin's choice persists across deploys
        name: m.name,
        description: m.description,
        version: m.version,
        developer: m.developer,
        apiVersion: m.apiVersion,
        permissions: JSON.stringify(m.permissions),
        allowedOrigins: JSON.stringify(m.allowedOrigins),
      },
    })
  }
}
