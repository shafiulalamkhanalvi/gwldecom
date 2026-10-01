/**
 * Every permission an extension can be granted. This is the single source
 * of truth for scope strings used across the registry, the admin consent UI,
 * and every /api/extensions/v1/* route's `requireScope()` check.
 *
 * Adding a new capability to the extension layer means adding a scope here
 * first, then referencing it — never invent a scope string inline in a route.
 */
export const EXTENSION_SCOPES = [
  "products:read",
  "products:write",
  "products:delete",
  "categories:read",
  "categories:write",
  "brands:read",
  "brands:write",
  "media:write",
  "orders:read",
  "users:read",
  "imports:write",
  "webhooks:read",
] as const

export type ExtensionScope = (typeof EXTENSION_SCOPES)[number]

export function isExtensionScope(value: unknown): value is ExtensionScope {
  return typeof value === "string" && (EXTENSION_SCOPES as readonly string[]).includes(value)
}

/** Human-readable label for the admin consent screen. */
export const SCOPE_LABELS: Record<ExtensionScope, string> = {
  "products:read": "View products",
  "products:write": "Create and update products",
  "products:delete": "Delete products",
  "categories:read": "View categories",
  "categories:write": "Create categories",
  "brands:read": "View brands",
  "brands:write": "Create brands",
  "media:write": "Fetch and attach product images",
  "orders:read": "View orders",
  "users:read": "View basic user/customer info",
  "imports:write": "Run product import jobs",
  "webhooks:read": "Read recent store events (product created/updated/deleted, etc.)",
}
