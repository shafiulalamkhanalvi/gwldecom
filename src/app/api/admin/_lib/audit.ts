import { db } from "@/lib/db"

type AuditInput = {
  actorId: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Writes an AuditLog entry. Failures are swallowed so a logging error
 * never breaks the primary mutation. (No src/lib/audit.ts exists, so we
 * keep a local helper inside the admin API surface.)
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: JSON.stringify(input.metadata ?? {}),
      },
    })
  } catch {
    // best-effort
  }
}
