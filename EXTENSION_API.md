# ShopHaat Extension API (v1)

This document describes the Extension Integration Layer: a versioned, permission-scoped API that lets external
clients — Chrome extensions today, other tools later — read and write store data without touching the theme or
any internal code.

```
Chrome Extension
  ↓ HTTPS, Bearer token
Extension API            /api/extensions/v1/*
  ↓
Authentication / Authorization   token lookup → scopes → rate limit
  ↓
Extension Integration Layer      src/app/api/extensions/v1/_lib/*
  ↓
Business Logic                   same Product/Category/Brand models the admin UI uses
  ↓
Database                         Postgres via Prisma
```

The theme/storefront never participates in this path. Admin UI pages under `/admin/extensions` only *display*
extension state (connections, activity) — they don't gate any API behavior.

## 1. API overview

- Base path: `/api/extensions/v1/`
- Format: JSON in, JSON out
- Runtime: Node.js (not Edge) — SSRF checks need Node's `dns` module
- All routes are additive-only within v1. Breaking changes ship as `/api/extensions/v2/`; v1 keeps working for a
  reasonable deprecation window.

### Response envelope

Success:
```json
{ "success": true, "...": "endpoint-specific fields" }
```

Error:
```json
{ "success": false, "code": "DUPLICATE_PRODUCT", "message": "A product with this source URL already exists." }
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No/malformed `Authorization` header |
| `INVALID_TOKEN` | 401 | Token not recognized |
| `TOKEN_EXPIRED` | 401 | Token past its expiry — reconnect |
| `TOKEN_REVOKED` | 401 | Token was revoked |
| `EXTENSION_DISABLED` | 403 | An admin disabled this extension globally |
| `CONNECTION_REVOKED` | 403 | The user revoked this specific connection |
| `PERMISSION_DENIED` | 403 | Token lacks the required scope |
| `INVALID_PAYLOAD` | 400 | Body isn't valid JSON / wrong shape |
| `VALIDATION_ERROR` | 422 | A field failed validation |
| `NOT_FOUND` | 404 | Entity doesn't exist |
| `DUPLICATE_PRODUCT` | 409 | Slug/SKU/sourceUrl collision |
| `CATEGORY_NOT_FOUND` / `BRAND_NOT_FOUND` | 422 | Referenced id doesn't exist |
| `IMAGE_FETCH_FAILED` / `IMAGE_REJECTED` | 422 | Image URL couldn't be fetched / isn't a valid image |
| `RATE_LIMITED` | 429 | Too many requests — see `retryAfterSeconds` |
| `ORIGIN_NOT_ALLOWED` | 403 | CORS origin not on the extension's allowlist |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## 2. Authentication

Token-based (not full OAuth2) — practical for a Chrome extension, which has no server to host a redirect/token
endpoint. Equivalent to a GitHub Personal Access Token flow:

1. A store admin logs into ShopHaat normally (existing NextAuth session — unchanged).
2. Admin goes to **Admin → Extensions**, opens the extension, clicks **Connect**.
3. A consent view shows exactly what the extension is requesting (see `permissions` below).
4. On approval, the server creates an `ExtensionConnection` (user ↔ extension) and issues a bearer token.
5. **The raw token is shown exactly once.** It is never stored in recoverable form — only its SHA-256 hash.
6. The admin pastes the token into the Chrome extension's settings (`chrome.storage.local`, options page, etc).
7. Every API call sends `Authorization: Bearer <token>`.

```
User → Connect Extension (Admin → Extensions) → Authorization (consent view) → Access Token (shown once) → Extension API
```

### Token properties
- Opaque, 256-bit random, prefixed `ext_`. Format is not meaningful to the client — do not parse it.
- **Expiration**: 90 days from issuance (`TOKEN_TTL_DAYS` in `src/lib/extensions/tokens.ts`).
- **Revocation**: immediate — `POST /api/admin/extensions/connections/:id/revoke` revokes the connection and every
  token under it. Enforced on every request (no cache window).
- **Rotation**: `POST /api/admin/extensions/connections/:id/rotate` issues a new token and revokes the old one
  atomically — no overlap window. Use this if a token may have leaked.
- Tokens authenticate **as the connecting user** — all writes are attributed to that user (`createdById`, audit
  logs), exactly like the user acting through the admin UI.

## 3. Permissions (scopes)

Defined once in `src/lib/extensions/scopes.ts`:

| Scope | Grants |
|---|---|
| `products:read` | List/view products |
| `products:write` | Create/update products |
| `products:delete` | Delete products |
| `categories:read` | List categories |
| `categories:write` | Create categories |
| `brands:read` | List brands |
| `brands:write` | Create brands |
| `media:write` | Submit image URLs (validated server-side before use) |
| `orders:read` | View orders (reserved — no route uses it yet) |
| `users:read` | View basic user info (reserved) |
| `imports:write` | Use `POST /import` |
| `webhooks:read` | Poll `/webhooks/events` |

**Enforcement is server-side only.** An extension's own UI may hide features it doesn't have permission for, but
the backend re-checks the token's granted scopes on every request (`extensionRoute({ scope: ... })` wrapper) — the
extension cannot escalate by simply calling the endpoint anyway.

An extension's **manifest** (`src/lib/extensions/registry.ts`) declares the maximum scopes it may ever request.
A **connection** grants a subset of that (today: admin approves all-or-nothing at connect time; the data model
already supports partial grants if a more granular consent UI is added later).

## 4. CORS

No `Access-Control-Allow-Origin: *`. Each `Extension` row carries an `allowedOrigins` allowlist (set in the
registry manifest). A request's `Origin` header is echoed back only if it matches an **enabled** extension's
allowlist; otherwise no CORS headers are sent (browser blocks the response).

**Required configuration**: once the Chrome extension has a published or dev ID, add it to
`EXTENSION_REGISTRY[].allowedOrigins` in `src/lib/extensions/registry.ts`:

```ts
allowedOrigins: ["chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef"]
```

This is the one piece of information needed from whoever builds the Chrome extension before the integration is
fully live — see `EXTENSION_DEVELOPER_GUIDE.md`.

## 5. Rate limits

In-memory, per-connection (see `src/lib/extensions/rate-limit.ts`):

| Bucket | Limit |
|---|---|
| General API | 120 req / 60s |
| `POST /import` | 20 req / 60s |
| `media/validate` (and image handling inside import) | 60 req / 60s |
| Auth attempts (per IP) | 20 req / 60s |

Exceeding a limit returns `429` with `code: "RATE_LIMITED"` and `retryAfterSeconds`.

> **Known limitation**: this project has no Redis/Upstash in its stack, so limits are enforced per server
> process. On a multi-instance serverless deployment (e.g. Vercel), the effective ceiling is
> `limit × warm instances`, not an exact global cap. For an exact cap, swap `rate-limit.ts`'s internals for
> `@upstash/ratelimit` — `checkRateLimit()`'s signature is the only thing routes depend on.

## 6. Endpoints

All require `Authorization: Bearer <token>` unless noted. All are versioned under `/api/extensions/v1/`.

### `GET /capabilities`
No extra scope required. Returns API version, this connection's granted scopes, and current rate limits.

### `GET /products`
Scope: `products:read`. Query: `search`, `sku`, `status`, `page`, `limit` (max 100).

### `POST /products`
Scope: `products:write`. Direct create — **no duplicate-URL workflow** (see `/import` for that). Body: see
"Product schema" below. Returns `409 DUPLICATE_PRODUCT` on slug/SKU collision.

### `GET /products/:id`
Scope: `products:read`.

### `PATCH /products/:id`
Scope: `products:write`. Partial update — only send fields you want to change.

### `DELETE /products/:id`
Scope: `products:delete` (deliberately separate from `products:write` — importers rarely need delete).

### `GET /products/lookup?sourceUrl=&sku=&slug=`
Scope: `products:read`. Duplicate-check helper — returns `{ found, product }` without creating anything.

### `GET /categories` / `POST /categories`
Scopes: `categories:read` / `categories:write`. `POST` is find-or-create by `name`.

### `GET /brands` / `POST /brands`
Scopes: `brands:read` / `brands:write`. Same find-or-create pattern.

### `POST /media/validate`
Scope: `media:write`. Body: `{ "url": "https://..." }`. Validates (SSRF + content-sniff) without attaching
anything — useful for an image-focused extension to pre-check before building a product payload.

### `POST /import` — the recommended product-creation path
Scope: `imports:write` **and** `products:write`. This is the "dedicated import workflow" — use this instead of
raw `POST /products` whenever you're importing from an external source:

1. Authenticate + authorize (handled by the wrapper)
2. Validate & sanitize payload
3. Check for an existing product by `sourceUrl` → **update** instead of create if found (handles re-imports/price
   refreshes cleanly); otherwise check slug/SKU collisions
4. Resolve `categoryId`/`categoryName` and `brandId`/`brandName` (creating if the connection has `*:write`)
5. Validate every image URL (SSRF + magic-byte sniff; rejects SVG)
6. Create or update the product
7. Record an `ExtensionActivity` row (always — success or failure)
8. Return a structured result

```json
// request
{
  "title": "Wireless Earbuds X200",
  "sku": "WEX200-BLK",
  "price": 2499,
  "compareAtPrice": 3200,
  "stockQuantity": 50,
  "description": "...",
  "categoryName": "Gadgets & IT Accessories",
  "brandName": "Generic",
  "images": [{ "url": "https://supplier.example.com/img1.jpg" }],
  "sourceUrl": "https://supplier.example.com/product/12345"
}
```
```json
// response (created)
{ "success": true, "productId": "clx...", "status": "created", "message": "Product imported successfully", "product": { ... } }
```
```json
// response (duplicate, no sourceUrl match but slug/sku clash)
{ "success": false, "code": "DUPLICATE_PRODUCT", "message": "A product with this slug already exists.", "productId": "clx..." }
```

### `GET /webhooks/events?since=&types=`
Scope: `webhooks:read`. **Polling**, not push — see "Events" below. Returns events since the given cursor.

## 7. Product schema

Request/response fields (`POST /products`, `POST /import`, `PATCH /products/:id`, and the `product` object in
responses):

| Field | Type | Notes |
|---|---|---|
| `title` | string | required on create |
| `slug` | string | optional — derived from `title` if omitted |
| `sku` | string | required on create, must be unique |
| `price` | number | required on create, ≥ 0 |
| `compareAtPrice` | number \| null | optional |
| `stockQuantity` | integer | optional, default 0 |
| `description` | string | HTML stripped — stored as plain text |
| `specifications` | `{k,v}[]` | key/value spec rows |
| `attributes` | object | free-form JSON |
| `tags` | string \| string[] | stored as comma-separated |
| `status` | `"draft" \| "published"` | extensions cannot set `"archived"` |
| `categoryId` *or* `categoryName` | string | `categoryName` requires `categories:write` to auto-create |
| `brandId` *or* `brandName` | string | `brandName` requires `brands:write` to auto-create |
| `images` | `{url, altText?}[]` | max 12, requires `media:write`, server-validated |
| `sourceUrl` | string | the page this was imported from — enables `/import`'s dedupe |

## 8. Events

Internal event bus (`src/lib/extensions/events.ts`) fires on every product create/update/delete, from **both**
the admin UI and the extension API: `product.created`, `product.updated`, `product.deleted` (plus
`order.created` / `inventory.updated` reserved for future use). `GET /webhooks/events` exposes a short rolling
buffer (last 500 events) for polling. This is deliberately not outbound push-webhook delivery (no signing,
retries, dead-lettering) — that's real infrastructure this project doesn't need yet. The internal
`emitStoreEvent()` call site is the only thing that would need to change to add real webhooks later.

## 9. Security

- **SSRF**: every extension-supplied URL the server fetches (images) is checked against private/internal IP
  ranges, both literal IPs and DNS-resolved hostnames, before fetching (`src/lib/extensions/ssrf.ts`).
- **Image validation**: content-type is sniffed from magic bytes, not trusted from headers; SVG is rejected
  outright (script risk); 8MB cap enforced during streaming, not just via `Content-Length`.
- **No raw HTML accepted**: all extension-supplied text is stripped of markup server-side
  (`src/lib/extensions/sanitize.ts`). If a future extension needs rich HTML, add a real allowlist sanitizer —
  don't loosen this.
- **IDOR**: every ID (product, category, brand, connection) is re-verified against the database on every request;
  nothing from the extension is trusted at face value.
- **No secrets ever reach the extension**: database credentials, NextAuth secret, admin passwords are never in
  any extension-facing response. Tokens are opaque and bear no embedded information.
- **SQL injection**: all queries go through Prisma's parameterized query builder — no raw SQL in this layer.
- **CSRF**: not applicable — this API uses bearer tokens, not cookies, so there's no ambient credential for a
  CSRF attack to ride on.

## 10. API versioning

`v1` is additive-only: existing fields/endpoints won't be removed or repurposed. If a breaking change becomes
necessary, it ships as `/api/extensions/v2/` and `v1` is kept running for a reasonable compatibility period
before deprecation — never pulled out from under existing installs without notice.
