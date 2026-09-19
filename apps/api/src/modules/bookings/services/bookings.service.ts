/*
  bookings.service.ts
  Database queries and business logic behind the public booking endpoints:
  calendar status, submitting a request, and status lookup by reference.
*/

import { randomInt } from "node:crypto";
import { and, desc, eq, gte, lte, inArray, or } from "drizzle-orm";
import { db, bookings, bookingPeriods, blockedPeriods, hijriDateOverrides, settings } from "@matam/db";
import {
  gregorianToHijri,
  hijriToGregorian,
  normalizePhone,
  PLACES_BY_GENDER,
  SPECIFIC_PERIODS,
  type AttendeeGender,
  type HijriDate,
  type Place,
  type Purpose,
  type SpecificPeriod,
} from "@matam/shared";
import {
  getHijriAdjustment,
  gregorianToAdjustedHijri,
  type HijriAdjustment,
} from "../../../helpers/hijri-adjustment.js";

type PeriodStatus = "free" | "pending" | "approved" | "blocked";

// ---------------- Interface 1: Public calendar day ----------------
// "all" isn't its own slot here — a caller derives its availability from
// whether morning/afternoon/evening are all free (see periodsConflict below).
export interface DayStatus {
  date: string;
  hijri: HijriDate;
  periods: Record<SpecificPeriod, PeriodStatus>;
}

// ---------------- Interface 2: Hijri correction anchor ----------------
interface HijriAnchor extends HijriDate { date: string; applyForward: boolean; }

// ---------------- Function 1: Get a month's calendar status ----------------
// Builds one entry per day in the month, with each period's status and Hijri date.
export async function getCalendarMonth(year: number, month: number): Promise<DayStatus[]> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Only pending/approved bookings hold a slot; rejected/cancelled don't block anything.
  // A whole-day booking is just 3 rows here, so no "all" expansion is needed.
  const activePeriods = await db
    .select({ eventDate: bookingPeriods.eventDate, period: bookingPeriods.period, status: bookingPeriods.status })
    .from(bookingPeriods)
    .where(
      and(
        gte(bookingPeriods.eventDate, firstDay),
        lte(bookingPeriods.eventDate, lastDay),
        inArray(bookingPeriods.status, ["pending", "approved"]),
      ),
    );

  // Index active bookings by "date|period" for O(1) lookup while building the response below.
  const statusByDayPeriod = new Map<string, PeriodStatus>();
  for (const row of activePeriods) {
    statusByDayPeriod.set(`${row.eventDate}|${row.period}`, row.status as PeriodStatus);
  }

  // A null (or "all") period on a block row means the whole day, so it sets every specific slot.
  const blocks = await db
    .select({ date: blockedPeriods.date, period: blockedPeriods.period })
    .from(blockedPeriods)
    .where(and(gte(blockedPeriods.date, firstDay), lte(blockedPeriods.date, lastDay)));
  const blockedSet = new Set<string>();
  for (const block of blocks) {
    const targetPeriods: SpecificPeriod[] = block.period === null || block.period === "all" ? [...SPECIFIC_PERIODS] : [block.period];
    for (const period of targetPeriods) {
      blockedSet.add(`${block.date}|${period}`);
    }
  }

  // Load exact corrections plus older forward anchors that can affect this month.
  const overrides = await db
    .select({
      date: hijriDateOverrides.gregorianDate,
      hijriYear: hijriDateOverrides.hijriYear,
      hijriMonth: hijriDateOverrides.hijriMonth,
      hijriDay: hijriDateOverrides.hijriDay,
      applyForward: hijriDateOverrides.applyForward,
    })
    .from(hijriDateOverrides)
    .where(lte(hijriDateOverrides.gregorianDate, lastDay));
  const overrideByDate = new Map<string, HijriAnchor>();
  const forwardAnchors: HijriAnchor[] = [];
  for (const override of overrides) {
    const anchor = {
      date: override.date,
      year: override.hijriYear,
      month: override.hijriMonth,
      day: override.hijriDay,
      applyForward: override.applyForward,
    };
    overrideByDate.set(override.date, anchor);
    if (override.applyForward) forwardAnchors.push(anchor);
  }
  forwardAnchors.sort((left, right) => left.date.localeCompare(right.date));

  // Load the quick correction once per calendar response, not once for every displayed day.
  const globalAdjustment = await getHijriAdjustment();

  // Compose each day with manual corrections taking precedence over the global calculated offset.
  const days: DayStatus[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      hijri: resolveEffectiveHijri(dateStr, { year, month, day }, overrideByDate, forwardAnchors, globalAdjustment),
      periods: {
        morning: resolvePeriodStatus(dateStr, "morning", statusByDayPeriod, blockedSet),
        afternoon: resolvePeriodStatus(dateStr, "afternoon", statusByDayPeriod, blockedSet),
        evening: resolvePeriodStatus(dateStr, "evening", statusByDayPeriod, blockedSet),
      },
    });
  }
  return days;
}

// ---------------- Helper 1: Resolve an override-aware Hijri date ----------------
// Exact corrections win; otherwise the newest opted-in anchor shifts the converter consistently.
function resolveEffectiveHijri(
  date: string,
  gregorian: { year: number; month: number; day: number },
  exactOverrides: Map<string, HijriAnchor>,
  forwardAnchors: HijriAnchor[],
  globalAdjustment: HijriAdjustment,
): HijriDate {
  // A correction for this exact date is the most specific administrative instruction.
  const exact = exactOverrides.get(date);
  if (exact) return { year: exact.year, month: exact.month, day: exact.day };

  // A forward correction remains authoritative until superseded by a newer manual anchor.
  const anchor = forwardAnchors.filter((candidate) => candidate.date < date).at(-1);
  if (!anchor) return gregorianToAdjustedHijri(gregorian, globalAdjustment);

  // Compare the converter's date for the approved Hijri anchor to derive a stable day offset.
  const convertedAnchor = hijriToGregorian({ year: anchor.year, month: anchor.month, day: anchor.day });
  const approvedGregorian = new Date(`${anchor.date}T00:00:00Z`);
  const convertedGregorian = new Date(Date.UTC(convertedAnchor.year, convertedAnchor.month - 1, convertedAnchor.day));
  const offsetDays = Math.round((convertedGregorian.getTime() - approvedGregorian.getTime()) / 86_400_000);
  const shifted = new Date(Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day + offsetDays));
  return gregorianToHijri({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() });
}

// ---------------- Helper 2: Resolve a public period status ----------------
// A committed booking takes precedence over a later block so an existing hold stays visible.
function resolvePeriodStatus(
  dateStr: string,
  period: SpecificPeriod,
  statusByDayPeriod: Map<string, PeriodStatus>,
  blockedSet: Set<string>,
): PeriodStatus {
  const bookingStatus = statusByDayPeriod.get(`${dateStr}|${period}`);
  if (bookingStatus) return bookingStatus;
  if (blockedSet.has(`${dateStr}|${period}`)) return "blocked";
  return "free";
}

// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to read aloud or retype.
const REFERENCE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// ---------------- Helper 3: Generate a booking reference ----------------
// Short human-readable code (e.g. "MTM-7K4X9P") requesters use later for status lookup.
function generateBookingReference(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += REFERENCE_CHARS[randomInt(REFERENCE_CHARS.length)];
  }
  return `MTM-${code}`;
}

const DEFAULT_MAX_MONTHS_AHEAD = 12;
const MAX_MONTHS_SETTING_KEY = "booking_max_months_ahead";

// ---------------- Helper 4: Get today's Gregorian date in Bahrain ----------------
// Booking cutoffs follow the venue's civil day even when the API host uses another timezone.
function getBahrainToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

// ---------------- Helper 5: Parse a strict Gregorian date ----------------
// Round-trip validation rejects impossible values such as 2026-02-31.
function parseGregorianDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

// ---------------- Helper 6: Read the configured booking horizon ----------------
// Invalid or absent administrative values safely fall back to the documented limit.
async function getMaxMonthsAhead(): Promise<number> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, MAX_MONTHS_SETTING_KEY)).limit(1);
  return typeof row?.value === "number" && Number.isInteger(row.value) && row.value > 0 && row.value <= 60
    ? row.value
    : DEFAULT_MAX_MONTHS_AHEAD;
}

// ---------------- Helper 7: Validate a requested date is bookable ----------------
async function checkDateBookable(dateStr: string): Promise<"ok" | "invalid_date" | "past_date" | "too_far_ahead"> {
  const requested = parseGregorianDate(dateStr);
  if (!requested) return "invalid_date";
  const today = getBahrainToday();

  if (requested < today) return "past_date";

  const maxDate = new Date(today);
  maxDate.setUTCMonth(maxDate.getUTCMonth() + await getMaxMonthsAhead());
  if (requested > maxDate) return "too_far_ahead";

  return "ok";
}

// ---------------- Helper 8: Detect a PostgreSQL uniqueness conflict ----------------
// Drizzle may expose PostgreSQL's error code directly or through the underlying cause.
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code
    ?? (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

// ---------------- Interface 3: Public booking submission ----------------
export interface CreateBookingInput {
  date: string;
  periods: SpecificPeriod[];
  name: string;
  phone: string;
  purpose: Purpose;
  purposeOther?: string;
  attendeeGender: AttendeeGender;
  place: Place;
  includeFemaleHall?: boolean;
}

export type CreateBookingResult =
  | { ok: true; reference: string; hijri: HijriDate }
  | {
      ok: false;
      reason:
        | "invalid_date"
        | "invalid_phone"
        | "invalid_purpose"
        | "invalid_place"
        | "invalid_period"
        | "past_date"
        | "too_far_ahead"
        | "blocked"
        | "slot_taken";
    };

// ---------------- Helper 9: Sort periods into a consistent, natural display order ----------------
function sortPeriods(periods: SpecificPeriod[]): SpecificPeriod[] {
  return [...periods].sort((a, b) => SPECIFIC_PERIODS.indexOf(a) - SPECIFIC_PERIODS.indexOf(b));
}

// ---------------- Helper 10: Resolve the effective Hijri date ----------------
// Administrative corrections take precedence over the local calculated mapping.
async function getEffectiveHijri(date: string, year: number, month: number, day: number): Promise<HijriDate> {
  // Fetch the most relevant manual correction and global offset concurrently for a fast submission path.
  const [[row], globalAdjustment] = await Promise.all([
    db
      .select({
        hijriYear: hijriDateOverrides.hijriYear,
        hijriMonth: hijriDateOverrides.hijriMonth,
        hijriDay: hijriDateOverrides.hijriDay,
        gregorianDate: hijriDateOverrides.gregorianDate,
        applyForward: hijriDateOverrides.applyForward,
      })
      .from(hijriDateOverrides)
      .where(or(eq(hijriDateOverrides.gregorianDate, date), and(lte(hijriDateOverrides.gregorianDate, date), eq(hijriDateOverrides.applyForward, true))))
      .orderBy(desc(hijriDateOverrides.gregorianDate))
      .limit(1),
    getHijriAdjustment(),
  ]);

  // Manual exact or forward corrections win; otherwise use the globally adjusted calculated date.
  if (row) {
    const anchor: HijriAnchor = { date: row.gregorianDate, year: row.hijriYear, month: row.hijriMonth, day: row.hijriDay, applyForward: row.applyForward };
    return resolveEffectiveHijri(date, { year, month, day }, new Map([[row.gregorianDate, anchor]]), row.applyForward ? [anchor] : [], globalAdjustment);
  }
  return gregorianToAdjustedHijri({ year, month, day }, globalAdjustment);
}

// ---------------- Helper 11: Check an administrative period block ----------------
// Whole-day rows use a null (or "all") period and therefore block every specific period;
// otherwise a block conflicts only when it names one of the requested periods.
async function isPeriodBlocked(date: string, periods: SpecificPeriod[]): Promise<boolean> {
  const rows = await db
    .select({ period: blockedPeriods.period })
    .from(blockedPeriods)
    .where(eq(blockedPeriods.date, date));
  return rows.some((row) => row.period === null || row.period === "all" || periods.includes(row.period));
}

// ---------------- Helper 12: Check whether any requested period is already actively booked ----------------
// This pre-check is the primary guard; booking_periods' own partial unique index is the
// backstop for a same-slot race between two near-simultaneous submissions.
async function isPeriodTaken(date: string, periods: SpecificPeriod[]): Promise<boolean> {
  const [row] = await db
    .select({ id: bookingPeriods.id })
    .from(bookingPeriods)
    .where(
      and(
        eq(bookingPeriods.eventDate, date),
        inArray(bookingPeriods.status, ["pending", "approved"]),
        inArray(bookingPeriods.period, periods),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// ---------------- Function 2: Create a booking request ----------------
// Inserts a pending booking; the DB's partial unique index is the final
// race-condition guard if two people submit the same slot at the same time.
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const dateCheck = await checkDateBookable(input.date);
  if (dateCheck !== "ok") return { ok: false, reason: dateCheck };

  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone) return { ok: false, reason: "invalid_phone" };

  // "Other" requires the requester's own reason; server-side since the client can't be trusted alone.
  if (input.purpose === "other" && !input.purposeOther?.trim()) {
    return { ok: false, reason: "invalid_purpose" };
  }

  // Re-validate place-for-gender even though the form already filters it, in case of a direct API call.
  if (!PLACES_BY_GENDER[input.attendeeGender].includes(input.place)) {
    return { ok: false, reason: "invalid_place" };
  }

  // Dedupe in case of a direct API call sending the same period twice.
  const periods = sortPeriods([...new Set(input.periods)]);
  if (periods.length === 0) {
    return { ok: false, reason: "invalid_period" };
  }

  if (await isPeriodBlocked(input.date, periods)) {
    return { ok: false, reason: "blocked" };
  }

  // Primary conflict guard — see isPeriodTaken's comment for why the unique index alone isn't enough.
  if (await isPeriodTaken(input.date, periods)) {
    return { ok: false, reason: "slot_taken" };
  }

  const [year, month, day] = input.date.split("-").map(Number);
  const hijri = await getEffectiveHijri(input.date, year, month, day);
  // Retry the extremely unlikely reference collision, but report a genuine slot race accurately.
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = generateBookingReference();
    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(bookings)
          .values({
            bookingReference: reference,
            eventDate: input.date,
            hijriYear: hijri.year,
            hijriMonth: hijri.month,
            hijriDay: hijri.day,
            requesterName: input.name,
            requesterPhone: normalizedPhone,
            purpose: input.purpose,
            purposeOther: input.purpose === "other" ? input.purposeOther!.trim() : undefined,
            attendeeGender: input.attendeeGender,
            place: input.place,
            // Only a Fatiha booked by a male attendee can opt the women's hall in — silently
            // ignored otherwise in case of a direct API call bypassing the form's own gating.
            includeFemaleHall: input.purpose === "fatiha" && input.attendeeGender === "male" ? Boolean(input.includeFemaleHall) : false,
          })
          .returning({ id: bookings.id });

        await tx.insert(bookingPeriods).values(
          periods.map((period) => ({ bookingId: row.id, eventDate: input.date, period, status: "pending" as const })),
        );
      });
      return { ok: true, reference, hijri };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      // Same-slot race backstop; distinguishes a genuine period conflict from a
      // (far less likely) booking_reference collision, which just retries below.
      if (await isPeriodTaken(input.date, periods)) return { ok: false, reason: "slot_taken" };
    }
  }

  throw new Error("Unable to generate a unique booking reference.");
}

// ---------------- Interface 4: Privacy-safe booking status ----------------
export interface BookingStatusResult {
  status: string;
  date: string;
  periods: SpecificPeriod[];
  hijri: HijriDate;
}

// ---------------- Function 3: Look up a booking's status ----------------
// Only privacy-safe fields are returned because visitors authenticate with the unique reference alone.
export async function getBookingStatus(reference: string): Promise<BookingStatusResult | null> {
  const normalizedReference = reference.trim().toUpperCase();

  const [row] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      eventDate: bookings.eventDate,
      hijriYear: bookings.hijriYear,
      hijriMonth: bookings.hijriMonth,
      hijriDay: bookings.hijriDay,
    })
    .from(bookings)
    .where(eq(bookings.bookingReference, normalizedReference))
    .limit(1);

  if (!row) return null;

  const periodRows = await db.select({ period: bookingPeriods.period }).from(bookingPeriods).where(eq(bookingPeriods.bookingId, row.id));

  return {
    status: row.status,
    date: row.eventDate,
    // The app never inserts "all" into booking_periods, so this narrowing always holds.
    periods: sortPeriods(periodRows.map((row) => row.period as SpecificPeriod)),
    hijri: { year: row.hijriYear, month: row.hijriMonth, day: row.hijriDay },
  };
}
