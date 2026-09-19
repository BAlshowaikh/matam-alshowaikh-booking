/*
  hijri-overrides.service.ts
  Database queries for admin-set Hijri date corrections — one override per
  Gregorian date; dates without a row use the calculated Umm al-Qura mapping.
*/

import { and, eq, gte, lte } from "drizzle-orm";
import { db, hijriDateOverrides, settings } from "@matam/db";
import { recordAuditLog } from "../../../helpers/audit-log.js";
import {
  getHijriAdjustment,
  HIJRI_ADJUSTMENT_SETTING_KEY,
  type HijriAdjustment,
} from "../../../helpers/hijri-adjustment.js";

// ---------------- Function 1: Read the quick Hijri adjustment ----------------
export async function getGlobalAdjustment() {
  return { days: await getHijriAdjustment() };
}

// ---------------- Function 2: Save the quick Hijri adjustment ----------------
export async function setGlobalAdjustment(days: HijriAdjustment, adminId: string) {
  // Upsert the single global setting so enabling this feature requires no schema migration.
  await db
    .insert(settings)
    .values({ key: HIJRI_ADJUSTMENT_SETTING_KEY, value: days, updatedBy: adminId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: days, updatedBy: adminId, updatedAt: new Date() },
    });

  // Record the change separately from date-specific corrections for clear accountability.
  await recordAuditLog("hijri_global_adjustment_set", adminId, HIJRI_ADJUSTMENT_SETTING_KEY, { days });
  return { days };
}

// ---------------- Function 3: List overrides in a date range ----------------
export async function listOverrides(from: string, to: string) {
  // Limit results to the range displayed by the current administrative view.
  return db
    .select()
    .from(hijriDateOverrides)
    .where(and(gte(hijriDateOverrides.gregorianDate, from), lte(hijriDateOverrides.gregorianDate, to)));
}

// ---------------- Function 4: Set (or replace) a date's override ----------------
// Upserts on gregorianDate — setting a correction twice just replaces the previous one.
export async function setOverride(
  gregorianDate: string,
  hijri: { year: number; month: number; day: number },
  applyForward: boolean,
  adminId: string,
) {
  const [row] = await db
    .insert(hijriDateOverrides)
    .values({
      gregorianDate,
      hijriYear: hijri.year,
      hijriMonth: hijri.month,
      hijriDay: hijri.day,
      applyForward,
      setBy: adminId,
    })
    .onConflictDoUpdate({
      target: hijriDateOverrides.gregorianDate,
      set: { hijriYear: hijri.year, hijriMonth: hijri.month, hijriDay: hijri.day, applyForward, setBy: adminId },
    })
    .returning();
  await recordAuditLog("hijri_override_set", adminId, gregorianDate, { ...hijri, applyForward });
  return row;
}

// ---------------- Function 5: Remove a date's override ----------------
// Reverts that date back to the calculated Umm al-Qura mapping.
export async function removeOverride(gregorianDate: string, adminId: string): Promise<boolean> {
  // Delete only the correction anchored to the requested Gregorian date.
  const deleted = await db
    .delete(hijriDateOverrides)
    .where(eq(hijriDateOverrides.gregorianDate, gregorianDate))
    .returning();
  if (deleted.length > 0) {
    // Audit successful removals without recording misleading events for absent rows.
    await recordAuditLog("hijri_override_removed", adminId, gregorianDate);
  }
  return deleted.length > 0;
}
