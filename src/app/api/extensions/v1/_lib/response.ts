import { NextResponse } from "next/server"

/**
 * All /api/extensions/v1/* responses share this envelope so a generic SDK
 * can parse them without per-endpoint special-casing. See EXTENSION_API.md
 * "Response envelope".
 */
export function extOk<T extends object>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}

export type ExtensionErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "EXTENSION_DISABLED"
  | "CONNECTION_REVOKED"
  | "PERMISSION_DENIED"
  | "INVALID_PAYLOAD"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DUPLICATE_PRODUCT"
  | "CATEGORY_NOT_FOUND"
  | "BRAND_NOT_FOUND"
  | "IMAGE_FETCH_FAILED"
  | "IMAGE_REJECTED"
  | "RATE_LIMITED"
  | "ORIGIN_NOT_ALLOWED"
  | "INTERNAL_ERROR"

const STATUS_BY_CODE: Record<ExtensionErrorCode, number> = {
  UNAUTHORIZED: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_REVOKED: 401,
  EXTENSION_DISABLED: 403,
  CONNECTION_REVOKED: 403,
  PERMISSION_DENIED: 403,
  INVALID_PAYLOAD: 400,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  DUPLICATE_PRODUCT: 409,
  CATEGORY_NOT_FOUND: 422,
  BRAND_NOT_FOUND: 422,
  IMAGE_FETCH_FAILED: 422,
  IMAGE_REJECTED: 422,
  RATE_LIMITED: 429,
  ORIGIN_NOT_ALLOWED: 403,
  INTERNAL_ERROR: 500,
}

export function extFail(code: ExtensionErrorCode, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, code, message, ...extra }, { status: STATUS_BY_CODE[code] })
}
