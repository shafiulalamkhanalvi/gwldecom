import { EventEmitter } from "events"

/**
 * Internal event architecture for the extension layer. Business-logic code
 * (product create/update/delete, order create, etc.) calls `emitStoreEvent`
 * — it does not need to know whether any extension cares. Extensions consume
 * events via `GET /api/extensions/v1/webhooks/events` (polling), which reads
 * from `recentStoreEvents()`.
 *
 * This is deliberately NOT outbound webhook delivery (no signing, retries,
 * or dead-lettering) — that's real infrastructure this project doesn't need
 * yet. Polling a short in-memory ring buffer is the "clean internal
 * abstraction" the integration layer calls for; swapping in real push
 * webhooks later only means changing `emitStoreEvent`'s body, not every
 * call site.
 */
export const STORE_EVENT_TYPES = [
  "product.created",
  "product.updated",
  "product.deleted",
  "order.created",
  "inventory.updated",
] as const
export type StoreEventType = (typeof STORE_EVENT_TYPES)[number]

export type StoreEvent = {
  id: string
  type: StoreEventType
  entityId: string
  occurredAt: string
  data: Record<string, unknown>
}

const RING_BUFFER_SIZE = 500
const ring: StoreEvent[] = []
const bus = new EventEmitter()
bus.setMaxListeners(50)

export function emitStoreEvent(type: StoreEventType, entityId: string, data: Record<string, unknown> = {}) {
  const event: StoreEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    entityId,
    occurredAt: new Date().toISOString(),
    data,
  }
  ring.push(event)
  if (ring.length > RING_BUFFER_SIZE) ring.shift()
  bus.emit(type, event)
  bus.emit("*", event)
}

/** Events after `sinceId` (exclusive), newest last. Used by the polling endpoint. */
export function recentStoreEvents(sinceId?: string, types?: StoreEventType[]): StoreEvent[] {
  let events = ring
  if (sinceId) {
    const idx = ring.findIndex((e) => e.id === sinceId)
    events = idx >= 0 ? ring.slice(idx + 1) : ring
  }
  if (types?.length) events = events.filter((e) => types.includes(e.type))
  return events
}
