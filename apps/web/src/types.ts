/*
  types.ts
  Defines the privacy-safe public API models used by the booking interface.
*/

import type { AttendeeGender, Period, Place, Purpose, SpecificPeriod } from "@matam/shared";

export type { AttendeeGender, Period, Place, Purpose, SpecificPeriod };
export type PeriodStatus = "free" | "pending" | "approved" | "blocked";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

// ---------------- Interface 1: Hijri date ----------------
export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

// ---------------- Interface 2: Calendar day ----------------
// "all" isn't a grid slot — its availability is derived from the 3 real periods.
export interface CalendarDay {
  date: string;
  hijri: HijriDate;
  periods: Record<SpecificPeriod, PeriodStatus>;
}

// ---------------- Interface 3: Public booking result ----------------
export interface BookingResult {
  reference: string;
  hijri: HijriDate;
  date: string;
  periods: SpecificPeriod[];
  purpose?: Purpose;
  purposeOther?: string;
  attendeeGender?: AttendeeGender;
  place?: Place;
  includeFemaleHall?: boolean;
  status: BookingStatus;
}

// ---------------- Interface 4: API failure ----------------
export interface ApiFailure {
  code?: string;
  error?: string;
}
