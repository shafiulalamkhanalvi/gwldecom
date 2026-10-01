# Building an Extension for ShopHaat

This guide is for whoever is building the Chrome extension (Product Importer, or any future one). It assumes
no knowledge of the ShopHaat codebase — everything you need is in this file and `EXTENSION_API.md`.

## What you need from us

- **Base URL**: `https://<your-store-domain>/api/extensions/v1/`
- **Your extension's Chrome ID** (dev or published) — we add it to the CORS allowlist. Nothing works cross-origin
  until this is done; see `EXTENSION_API.md` §4.
- A short description, developer name, and the list of permissions your extension needs (pick from the table in
  `EXTENSION_API.md` §3) — we add a manifest entry in `src/lib/extensions/registry.ts`.

## Connecting a store (what the user does)

1. The store admin logs into their ShopHaat admin panel.
2. They go to **Admin → Extensions → [Your Extension] → Connect**.
3. They copy the token shown (one time only) and paste it into your extension's settings/options page.
4. Your extension stores it (e.g. `chrome.storage.local`) and sends it as `Authorization: Bearer <token>` on
   every API call from then on.

Your extension does not need to implement any OAuth redirect flow — there's no "Connect" button inside the
extension itself that talks to the server; the connection is established on the store's admin page.

## Verifying the connection

On startup (or whenever the token might have changed), call:

```
GET /api/extensions/v1/capabilities
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "apiVersion": "v1",
  "extension": { "id": "product-importer", "name": "Product Importer", "version": "1.0.0" },
  "user": { "id": "...", "name": "Mishkat", "role": "admin" },
  "grantedScopes": ["products:read", "products:write", "categories:read", "categories:write", "brands:read", "brands:write", "media:write", "imports:write"],
  "rateLimits": { "general": { "limit": 120, "windowMs": 60000 }, "imports": { "limit": 20, "windowMs": 60000 }, "media": { "limit": 60, "windowMs": 60000 } }
}
```

If this returns `401 INVALID_TOKEN` / `TOKEN_EXPIRED` / `TOKEN_REVOKED`, show the user a "reconnect" prompt —
tokens expire after 90 days and can be revoked by the admin at any time.

## Importing a product (the common case)

```js
async function importProduct(token, payload) {
  const res = await fetch("https://store.example.com/api/extensions/v1/import", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!json.success) {
    // json.code is one of the error codes in EXTENSION_API.md — switch on it,
    // don't parse json.message for logic.
    throw new Error(`${json.code}: ${json.message}`)
  }
  return json // { productId, status: "created" | "updated", product, warnings }
}
```

Minimal payload:
```json
{
  "title": "Wireless Earbuds X200",
  "sku": "WEX200-BLK",
  "price": 2499,
  "categoryName": "Gadgets & IT Accessories",
  "images": [{ "url": "https://supplier.example.com/img1.jpg" }],
  "sourceUrl": "https://supplier.example.com/product/12345"
}
```

Always send `sourceUrl` when you have one — it's what lets `/import` recognize "I've already imported this page"
and update rather than create a duplicate, which is almost always what you want for a page-scraping importer.

### Before importing: check for a duplicate (optional but recommended)

```
GET /api/extensions/v1/products/lookup?sourceUrl=https%3A%2F%2Fsupplier.example.com%2Fproduct%2F12345
```
```json
{ "success": true, "found": true, "product": { "id": "clx...", "status": "published", "updatedAt": "..." } }
```

Use this to show the user "already imported — will update" before they commit, without actually writing
anything.

## Error handling

Switch on `code`, not `message` (messages are human-readable and may change wording). Codes are listed in
`EXTENSION_API.md` §1. The ones you'll hit most as an importer:

| Code | What to do |
|---|---|
| `DUPLICATE_PRODUCT` | Offer "update existing" — resubmit via `/import` with the same `sourceUrl`, or `PATCH /products/:id` using the returned `productId` |
| `CATEGORY_NOT_FOUND` / `BRAND_NOT_FOUND` | You passed an `id` that doesn't exist — switch to `categoryName`/`brandName` instead, or call `GET /categories` / `GET /brands` to pick a valid one |
| `IMAGE_REJECTED` / `IMAGE_FETCH_FAILED` | Drop that image and retry without it, or surface it to the user — don't silently loop/retry the same URL |
| `RATE_LIMITED` | Back off for `retryAfterSeconds`, then retry |
| `TOKEN_EXPIRED` / `TOKEN_REVOKED` | Prompt the user to reconnect — nothing else you can do client-side |
| `PERMISSION_DENIED` | The connection wasn't granted a scope your request needs — this is a configuration problem (ask the user to reconnect/re-approve), not something to retry |

## Rate limits

See `EXTENSION_API.md` §5. If you're doing a bulk import of many products, pace your requests (e.g. one
`/import` call every 2-3 seconds) rather than firing them all at once — you'll hit `429` otherwise, and bursting
harder doesn't get you further since the limit is per-connection.

## What you will never receive from this API

No database credentials, no internal service keys, no admin passwords, no other users' tokens. The token you
hold authenticates as the one store user who connected you, scoped to exactly the permissions they approved.

## Versioning promise

Everything under `/api/extensions/v1/` is additive-only — new optional fields may appear, existing ones won't be
removed or repurposed. If we ever need a breaking change, it ships as `/api/extensions/v2/` and `v1` keeps
working for a reasonable transition period. Pin to `v1` in your base URL; don't assume `v1` disappears without
notice.

## Adding a capability we haven't built yet

If you need an endpoint that doesn't exist (e.g. order read access, inventory sync), the shape is already there
to extend — `src/app/api/extensions/v1/<your-route>/route.ts` using the `extensionRoute()` wrapper from `_lib/auth.ts`
for auth/scopes/rate-limiting/CORS, and a new scope added to `src/lib/extensions/scopes.ts` if needed. Reach out
rather than inventing a parallel auth mechanism — everything should go through the same token/scope system
described here.
