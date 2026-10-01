import crypto from "crypto"

const TOKEN_PREFIX = "ext_"
export const TOKEN_TTL_DAYS = 90

/** Generates a new raw bearer token. Only ever returned to the caller once. */
export function generateRawToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url")
}

/** Deterministic, non-reversible hash used as the DB lookup key and storage form. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

/** Short, safe-to-display fragment shown in the admin UI ("ext_a1B2c3…"). */
export function tokenPrefixForDisplay(raw: string): string {
  return raw.slice(0, 10)
}

export function tokenExpiryDate(days = TOKEN_TTL_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

/** Extracts a bearer token from an Authorization header, or null. */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  return match ? match[1].trim() : null
}
