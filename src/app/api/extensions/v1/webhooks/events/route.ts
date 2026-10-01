import { extensionRoute, preflight } from "@/app/api/extensions/v1/_lib/auth"
import { extOk, extFail } from "@/app/api/extensions/v1/_lib/response"
import { recentStoreEvents, STORE_EVENT_TYPES, type StoreEventType } from "@/lib/extensions/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/extensions/v1/webhooks/events?since=<eventId>&types=product.created,product.updated
// Requires webhooks:read. Polling rather than push (see src/lib/extensions/events.ts
// for why) — an extension calls this periodically, remembers the last event
// id it saw, and passes it back as `since` next time.
export const GET = extensionRoute({ scope: "webhooks:read" }, async (req) => {
  const sp = req.nextUrl.searchParams
  const since = sp.get("since") ?? undefined
  const typesParam = sp.get("types")
  let types: StoreEventType[] | undefined
  if (typesParam) {
    const requested = typesParam.split(",").map((t) => t.trim())
    const invalid = requested.filter((t) => !STORE_EVENT_TYPES.includes(t as StoreEventType))
    if (invalid.length) return extFail("VALIDATION_ERROR", `Unknown event type(s): ${invalid.join(", ")}`)
    types = requested as StoreEventType[]
  }

  const events = recentStoreEvents(since, types)
  return extOk({ events, cursor: events.length ? events[events.length - 1].id : (since ?? null) })
})

export const OPTIONS = preflight
