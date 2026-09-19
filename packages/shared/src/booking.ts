/*
  booking.ts
  Canonical booking domain values and contact-number normalization shared by
  the database, API validation, and web UI.
*/

// ---------------- Data 1: Booking periods ----------------
// "all" is a whole-day request; it conflicts with every specific period on
// the same date and vice versa (enforced in the bookings service).
export const SPECIFIC_PERIODS = ["morning", "afternoon", "evening"] as const;
export type SpecificPeriod = (typeof SPECIFIC_PERIODS)[number];

export const PERIODS = [...SPECIFIC_PERIODS, "all"] as const;
export type Period = (typeof PERIODS)[number];

// ---------------- Data 2: Booking purpose ----------------
export const PURPOSES = ["fatiha", "wedding", "aqd_qiran", "tathwibat", "nuthur", "mawaqeet", "other"] as const;
export type Purpose = (typeof PURPOSES)[number];

// ---------------- Data 3: Attendee gender ----------------
export const ATTENDEE_GENDERS = ["male", "female"] as const;
export type AttendeeGender = (typeof ATTENDEE_GENDERS)[number];

// ---------------- Data 4: Booking place ----------------
export const PLACES = ["old_matam", "male_hall", "female_hall", "male_tent"] as const;
export type Place = (typeof PLACES)[number];

// Which places are offered for a given attendee gender.
export const PLACES_BY_GENDER: Record<AttendeeGender, readonly Place[]> = {
  male: ["old_matam", "male_hall", "female_hall", "male_tent"],
  female: ["female_hall"],
};

// Which periods are offered at a given place — open for every place today,
// but kept as a lookup so a future restriction (e.g. no morning tent use)
// is a one-line edit here instead of a code change.
export const PLACE_ALLOWED_PERIODS: Record<Place, readonly Period[]> = {
  old_matam: PERIODS,
  male_hall: PERIODS,
  female_hall: PERIODS,
  male_tent: PERIODS,
};

// ---------------- Function 1: Normalize a Bahrain contact number ----------------
export function normalizePhone(phone: string): string | null {
  // Accept Arabic or Latin numerals and common formatting while producing one comparable value.
  let digits = phone
    .trim()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[\s()+-]/g, "");

  // Keep +973 and 00973 convenient without requiring a Bahrain country prefix.
  if (/^973\d{8}$/.test(digits)) digits = digits.slice(3);
  else if (/^00973\d{8}$/.test(digits)) digits = digits.slice(5);
  return /^\d{8}$/.test(digits) ? digits : null;
}
