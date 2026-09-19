/*
  schemas.ts
  Reusable TypeBox schemas built from the canonical booking domain values in
  @matam/shared, so a route's validation always matches the DB enum.
*/

import { Type, type TLiteral, type TUnion } from "@sinclair/typebox";
import { ATTENDEE_GENDERS, PERIODS, PLACES, PURPOSES, SPECIFIC_PERIODS } from "@matam/shared";

// ---------------- Helper 1: Build a TypeBox union from a literal-value array ----------------
// Array.prototype.map widens the tuple to a plain array, which would make TypeBox infer
// Static<> as `never` — the cast restores the precise per-element literal tuple type
// (the runtime shape is identical either way, only the static type was wrong).
function literalUnion<T extends readonly string[]>(values: T): TUnion<TLiteral<T[number]>[]> {
  return Type.Union(values.map((value) => Type.Literal(value))) as TUnion<TLiteral<T[number]>[]>;
}

// The four bookable periods, including the whole-day "all" option — used only for the
// admin bookings filter, where "all" still means "filter to whole-day bookings".
export const periodSchema = literalUnion(PERIODS);

// Just the three real periods — used where "all" isn't a valid choice (admin blocking).
export const specificPeriodSchema = literalUnion(SPECIFIC_PERIODS);

// A booking request's period selection: 1-3 distinct specific periods; a whole-day
// request is simply all three, never its own stored value — see bookings.service.ts.
export const periodsSchema = Type.Array(specificPeriodSchema, { minItems: 1, maxItems: 3 });

export const purposeSchema = literalUnion(PURPOSES);
export const attendeeGenderSchema = literalUnion(ATTENDEE_GENDERS);
export const placeSchema = literalUnion(PLACES);
