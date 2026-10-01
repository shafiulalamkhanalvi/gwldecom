/**
 * Fixed-window rate limiter for /api/extensions/v1/*.
 *
 * IMPORTANT LIMITATION: this stores counters in an in-memory Map, which is
 * only correct for a single long-lived server process. This project has no
 * Redis/Upstash in its stack (see package.json), so this is the best
 * available default without adding infrastructure. On a serverless platform
 * with multiple concurrent instances (e.g. Vercel), each instance enforces
 * its own limit, so the *effective* ceiling is roughly
 * `limit * (number of warm instances)` rather than a hard global cap.
 *
 * To make this exact under multi-instance deployment, swap this module's
 * internals for `@upstash/ratelimit` (Redis-backed) — the `checkRateLimit()`
 * call signature below is deliberately the only thing routes depend on, so
 * that swap doesn't touch route code. Documented in EXTENSION_API.md.
 */

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

// Periodically evict expired buckets so this Map can't grow unbounded.
setInterval(
  () => {
    const now = Date.now()
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key)
  },
  5 * 60 * 1000
).unref?.()

export type RateLimitConfig = { limit: number; windowMs: number }

/** Named default limits — pass the right one per route family. */
export const RATE_LIMITS = {
  /** General authenticated API traffic per connection. */
  api: { limit: 120, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Product import jobs per connection — the expensive path (image fetches, DB writes). */
  imports: { limit: 20, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Image validation/fetch operations per connection. */
  media: { limit: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Token/auth attempts per IP — deliberately strict to slow down credential stuffing. */
  auth: { limit: 20, windowMs: 60_000 } satisfies RateLimitConfig,
} as const

export type RateLimitResult = { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number }

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.limit - 1 }
  }
  if (existing.count >= config.limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) }
  }
  existing.count += 1
  return { allowed: true, remaining: config.limit - existing.count }
}
