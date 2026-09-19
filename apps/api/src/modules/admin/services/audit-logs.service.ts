/*
  audit-logs.service.ts
  Read-only queries over the audit_logs table for the admin-facing history
  view — every approval, rejection, block, and Hijri correction is written
  here by helpers/audit-log.ts; this file only reads it back.
*/

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, auditLogs, admins } from "@matam/db";

export interface AuditLogFilters {
  action?: string;
  adminId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

// ---------------- Function 1: List audit log entries, newest first ----------------
// Joins to admins so the history view can show a username instead of a bare id.
export async function listAuditLogs(filters: AuditLogFilters) {
  const conditions = [];
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.adminId) conditions.push(eq(auditLogs.adminId, filters.adminId));
  if (filters.from) conditions.push(gte(auditLogs.createdAt, new Date(filters.from)));
  if (filters.to) conditions.push(lte(auditLogs.createdAt, new Date(filters.to)));

  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      adminId: auditLogs.adminId,
      adminUsername: admins.username,
    })
    .from(auditLogs)
    .innerJoin(admins, eq(auditLogs.adminId, admins.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);
}
