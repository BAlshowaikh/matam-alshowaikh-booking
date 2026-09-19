/*
  hijri-adjustment.ts
  Reads and applies the administrator's global Hijri day adjustment while
  keeping its accepted range consistent across API features.
*/

import { eq } from "drizzle-orm";
import { db, settings } from "@matam/db";
import { gregorianToHijri, type GregorianDate, type HijriDate } from "@matam/shared";

export type HijriAdjustment = -2 | -1 | 0 | 1 | 2;

export const HIJRI_ADJUSTMENT_SETTING_KEY = "hijri_global_adjustment_days";

// ---------------- Helper 1: Normalize a stored Hijri adjustment ----------------
// Invalid legacy or manually edited values safely fall back to the unadjusted calendar.
export function normalizeHijriAdjustment(value: unknown): HijriAdjustment {
  return value === -2 || value === -1 || value === 0 || value === 1 || value === 2 ? value : 0;
}

// ---------------- Function 1: Read the global Hijri adjustment ----------------
export async function getHijriAdjustment(): Promise<HijriAdjustment> {
  // Read only the configured value because metadata is not needed during date conversion.
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, HIJRI_ADJUSTMENT_SETTING_KEY))
    .limit(1);

  return normalizeHijriAdjustment(row?.value);
}

// ---------------- Function 2: Convert with the global Hijri adjustment ----------------
// Moving the Gregorian input by N days produces the same displayed Hijri-day offset used by calendar apps.
export function gregorianToAdjustedHijri(date: GregorianDate, adjustment: HijriAdjustment): HijriDate {
  // UTC arithmetic avoids daylight-saving or server-timezone changes at day boundaries.
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + adjustment));
  return gregorianToHijri({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}
