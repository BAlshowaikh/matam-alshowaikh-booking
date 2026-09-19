/*
  helpers.ts (bookings)
  Formatting and calendar helpers shared by the public booking pages.
*/

import { HIJRI_MONTH_NAMES_AR, HIJRI_MONTH_NAMES_EN, SPECIFIC_PERIODS } from "@matam/shared";
import type { BookingResult, CalendarDay, HijriDate, SpecificPeriod } from "../types";

// Single source of truth for these names lives in @matam/shared, shared with the API.
export const HIJRI_MONTHS = { ar: HIJRI_MONTH_NAMES_AR, en: HIJRI_MONTH_NAMES_EN };

// ---------------- Helper 1: Format a Gregorian date ----------------
export function formatGregorian(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-BH" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

// ---------------- Helper 2: Format a Hijri date ----------------
export function formatHijri(value: HijriDate, language: string): string {
  const locale = language === "ar" ? "ar" : "en";
  return `${new Intl.NumberFormat(locale).format(value.day)} ${HIJRI_MONTHS[locale][value.month - 1]} ${new Intl.NumberFormat(locale).format(value.year)}`;
}

// ---------------- Helper 3: Format the primary Hijri month heading ----------------
export function formatHijriMonth(value: Pick<HijriDate, "year" | "month">, language: string): string {
  const locale = language === "ar" ? "ar" : "en";
  return `${HIJRI_MONTHS[locale][value.month - 1]} ${new Intl.NumberFormat(locale).format(value.year)}`;
}

// ---------------- Helper 4: Get localized weekday labels ----------------
export function weekdays(language: string): string[] {
  const formatter = new Intl.DateTimeFormat(language === "ar" ? "ar-BH" : "en-GB", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, 6 + index))));
}

// ---------------- Helper 5: Get today's Bahrain date key ----------------
export function getTodayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// ---------------- Helper 6: Restore the latest confirmation safely ----------------
export function getStoredBooking(): BookingResult | null {
  const stored = sessionStorage.getItem("matam-last-booking");
  if (!stored) return null;
  try { return JSON.parse(stored) as BookingResult; }
  catch { return null; }
}

// ---------------- Helper 7: Shift a Hijri month without date conversion ----------------
export function shiftHijriMonth(value: Pick<HijriDate, "year" | "month">, amount: number): Pick<HijriDate, "year" | "month"> {
  const absoluteMonth = value.year * 12 + value.month - 1 + amount;
  return { year: Math.floor(absoluteMonth / 12), month: absoluteMonth % 12 + 1 };
}

// ---------------- Helper 8: Add Gregorian days to an API date ----------------
export function addDays(value: string, amount: number): Date {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date;
}

// ---------------- Helper 9: Format the secondary Gregorian range ----------------
export function formatGregorianRange(days: CalendarDay[], language: string): string {
  if (!days.length) return "";
  const formatter = new Intl.DateTimeFormat(language === "ar" ? "ar-BH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(new Date(`${days[0].date}T12:00:00`))} — ${formatter.format(new Date(`${days.at(-1)!.date}T12:00:00`))}`;
}

// ---------------- Helper 10: Format the primary Gregorian month heading ----------------
export function formatGregorianMonth(value: Date, language: string): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-BH" : "en-GB", { month: "long", year: "numeric" }).format(value);
}

// ---------------- Helper 11: Format the secondary Hijri range ----------------
export function formatHijriRange(days: CalendarDay[], language: string): string {
  if (!days.length) return "";
  return `${formatHijri(days[0].hijri, language)} — ${formatHijri(days.at(-1)!.hijri, language)}`;
}

// ---------------- Helper 12: Join selected periods into a readable label ----------------
export function formatPeriods(periods: SpecificPeriod[], t: (key: string) => string): string {
  if (periods.length === 3) return t("all");
  return [...periods]
    .sort((a, b) => SPECIFIC_PERIODS.indexOf(a) - SPECIFIC_PERIODS.indexOf(b))
    .map((item) => t(item))
    .join(", ");
}
