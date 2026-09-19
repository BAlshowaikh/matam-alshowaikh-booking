/*
  blocked-periods.service.ts
  Database queries for admin-managed blocked days/periods — a day can be
  blocked entirely, or just one period within it.
*/

import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, blockedPeriods } from "@matam/db";
import type { SpecificPeriod } from "@matam/shared";
import { recordAuditLog } from "../../../helpers/audit-log.js";

// ---------------- Function 1: List blocked periods in a date range ----------------
export async function listBlockedPeriods(from: string, to: string) {
  return db
    .select()
    .from(blockedPeriods)
    .where(and(gte(blockedPeriods.date, from), lte(blockedPeriods.date, to)));
}

// ---------------- Function 2: Block a day (or one period of it) ----------------
export async function blockPeriod(
  date: string,
  period: SpecificPeriod | undefined,
  reason: string | undefined,
  adminId: string,
) {
  const [row] = await db
    .insert(blockedPeriods)
    .values({ date, period, reason, blockedBy: adminId })
    .returning();
  await recordAuditLog("period_blocked", adminId, row.id, { date, period, reason });
  return row;
}

// ---------------- Function 3: Remove a block ----------------
export async function unblockPeriod(id: string, adminId: string): Promise<boolean> {
  const deleted = await db.delete(blockedPeriods).where(eq(blockedPeriods.id, id)).returning();
  if (deleted.length > 0) {
    await recordAuditLog("period_unblocked", adminId, id);
  }
  return deleted.length > 0;
}

// ---------------- Function 4: Check whether a specific date+period is blocked ----------------
// A whole-day block (period IS NULL) covers every specific period.
export async function isPeriodBlocked(date: string, period: SpecificPeriod): Promise<boolean> {
  const [row] = await db
    .select({ id: blockedPeriods.id })
    .from(blockedPeriods)
    .where(
      and(
        eq(blockedPeriods.date, date),
        or(isNull(blockedPeriods.period), eq(blockedPeriods.period, period)),
      ),
    )
    .limit(1);
  return Boolean(row);
}
