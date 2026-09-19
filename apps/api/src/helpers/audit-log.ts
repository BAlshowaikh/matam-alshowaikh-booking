/*
  audit-log.ts
  Records one row per admin action (approvals, rejections, blocks, Hijri
  corrections) for the admin-facing audit history.
*/

import { db, auditLogs } from "@matam/db";

// ---------------- Function 1: Record an audit log entry ----------------
export async function recordAuditLog(
  action: string,
  adminId: string,
  entityId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditLogs).values({ action, adminId, entityId, details });
}
