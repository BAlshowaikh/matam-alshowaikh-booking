/*
  api.ts
  Provides typed public booking API calls and a consistent error abstraction.
*/

import type { ApiFailure, AttendeeGender, BookingResult, CalendarDay, Place, Purpose, SpecificPeriod } from "./types";

export class ApiError extends Error {
  // ---------------- Method 1: Create an API error ----------------
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

// ---------------- Helper 1: Parse an API response ----------------
async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & ApiFailure;
  if (!response.ok) throw new ApiError(payload.code ?? "REQUEST_ERROR", payload.error ?? "Request failed");
  return payload;
}

// ---------------- Function 1: Load a calendar month ----------------
export async function getCalendar(year: number, month: number): Promise<CalendarDay[]> {
  return parseResponse(await fetch(`/api/calendar/${year}/${month}`));
}

// ---------------- Function 2: Load a three-month Gregorian window ----------------
// A Hijri month crosses Gregorian boundaries, so the calendar needs adjacent API months.
export async function getCalendarWindow(anchor: Date): Promise<CalendarDay[]> {
  const monthStarts = [-1, 0, 1].map((offset) => new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1));
  const responses = await Promise.all(monthStarts.map((month) => getCalendar(month.getFullYear(), month.getMonth() + 1)));
  return responses.flat().sort((left, right) => left.date.localeCompare(right.date));
}

// ---------------- Function 3: Submit a booking ----------------
export async function createBooking(input: {
  date: string;
  periods: SpecificPeriod[];
  name: string;
  phone: string;
  purpose: Purpose;
  purposeOther?: string;
  attendeeGender: AttendeeGender;
  place: Place;
  includeFemaleHall?: boolean;
  website?: string;
}): Promise<BookingResult> {
  const result = await parseResponse<BookingResult>(await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));

  // Enrich legacy API responses from the just-submitted input so confirmation stays complete during rolling deployments.
  return {
    ...result,
    purpose: result.purpose ?? input.purpose,
    purposeOther: result.purposeOther ?? input.purposeOther,
    attendeeGender: result.attendeeGender ?? input.attendeeGender,
    place: result.place ?? input.place,
    periods: result.periods ?? input.periods,
    includeFemaleHall: result.includeFemaleHall ?? input.includeFemaleHall,
  };
}

// ---------------- Function 4: Look up booking status ----------------
export async function lookupBooking(reference: string): Promise<BookingResult> {
  const query = new URLSearchParams({ reference });
  return parseResponse(await fetch(`/api/bookings/lookup?${query}`));
}
