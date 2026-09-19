/*
  bookings.routes.ts
  Public booking endpoints: calendar status, submitting a booking request,
  and rate-limited status lookup by booking reference.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { attendeeGenderSchema, periodsSchema, placeSchema, purposeSchema } from "../../../helpers/schemas.js";
import { createBooking, getBookingStatus, getCalendarMonth } from "../services/bookings.service.js";

// Validates the URL params AND gives request.params real TypeScript types below.
const calendarParamsSchema = Type.Object({
  year: Type.Integer({ minimum: 2020, maximum: 2100 }),
  month: Type.Integer({ minimum: 1, maximum: 12 }),
});

// Formatting is normalized in the handler; the service validates the canonical value.
const createBookingBodySchema = Type.Object({
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  periods: periodsSchema,
  name: Type.String({ minLength: 2, maxLength: 200 }),
  phone: Type.String({ minLength: 8, maxLength: 24 }),
  purpose: purposeSchema,
  // Required only when purpose = "other" — the service validates that conditional rule.
  purposeOther: Type.Optional(Type.String({ maxLength: 500 })),
  attendeeGender: attendeeGenderSchema,
  place: placeSchema,
  // Only honored when purpose = "fatiha" and attendeeGender = "male" — see the service.
  includeFemaleHall: Type.Optional(Type.Boolean()),
  // Honeypot: hidden in the real form, so only bots fill it in.
  website: Type.Optional(Type.String()),
});

const lookupQuerySchema = Type.Object({
  reference: Type.String({ minLength: 1 }),
});

const bookingErrorMessages = {
  invalid_date: "The selected date is invalid.",
  invalid_phone: "Enter a valid 8-digit contact number.",
  invalid_purpose: "Enter a reason for \"Other\".",
  invalid_place: "This place isn't available for the selected attendee gender.",
  invalid_period: "Select at least one period.",
  past_date: "This date is in the past.",
  too_far_ahead: "Bookings can only be made up to 12 months in advance.",
  blocked: "This period is not available for booking.",
  slot_taken: "This slot was just booked by someone else — please choose another.",
} as const;

const bookingErrorCodes = {
  invalid_date: "INVALID_DATE",
  invalid_phone: "INVALID_PHONE",
  invalid_purpose: "INVALID_PURPOSE",
  invalid_place: "INVALID_PLACE",
  invalid_period: "INVALID_PERIOD",
  past_date: "PAST_DATE",
  too_far_ahead: "TOO_FAR_AHEAD",
  blocked: "PERIOD_BLOCKED",
  slot_taken: "SLOT_TAKEN",
} as const;

// ---------------- Route 1: GET /calendar/:year/:month ----------------
export const bookingsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Returns each day's Hijri date and per-period status for the requested month.
  app.get(
    "/calendar/:year/:month",
    { schema: { params: calendarParamsSchema } },
    async (request) => {
      const { year, month } = request.params;
      return getCalendarMonth(year, month);
    },
  );

  // ---------------- Route 2: POST /bookings ----------------
  // Submits a booking request. Honeypot hits get a fake success, nothing is stored.
  app.post(
    "/bookings",
    {
      schema: { body: createBookingBodySchema },
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { date, periods, name, phone, purpose, purposeOther, attendeeGender, place, includeFemaleHall, website } = request.body;

      if (website) {
        return reply.code(201).send({ reference: "MTM-000000" });
      }

      const result = await createBooking({ date, periods, name, phone, purpose, purposeOther, attendeeGender, place, includeFemaleHall });
      if (!result.ok) {
        const statusCode = result.reason.startsWith("invalid_") ? 400 : 409;
        return reply.code(statusCode).send({
          code: bookingErrorCodes[result.reason],
          error: bookingErrorMessages[result.reason],
        });
      }
      return reply.code(201).send({
        reference: result.reference,
        hijri: result.hijri,
        date,
        periods,
        purpose,
        purposeOther: purpose === "other" ? purposeOther?.trim() : undefined,
        attendeeGender,
        place,
        includeFemaleHall: purpose === "fatiha" && attendeeGender === "male" ? Boolean(includeFemaleHall) : false,
        status: "pending",
      });
    },
  );

  // ---------------- Route 3: GET /bookings/lookup ----------------
  // Status check without login uses the unique reference and strict rate limiting to deter enumeration.
  app.get(
    "/bookings/lookup",
    { schema: { querystring: lookupQuerySchema }, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { reference } = request.query;
      const result = await getBookingStatus(reference);
      if (!result) {
        return reply.code(404).send({
          code: "BOOKING_NOT_FOUND",
          error: "No booking found for that reference.",
        });
      }
      return result;
    },
  );
};
