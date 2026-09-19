/*
  schema.ts
  Drizzle table definitions for the Matam Alshowaikh booking database.
  drizzle-kit reads this file to generate SQL migrations.
*/

import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  smallint,
  pgEnum,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { ATTENDEE_GENDERS, PERIODS, PLACES, PURPOSES } from "@matam/shared/booking";

// ---------------- Enum 1: Booking period ----------------
// "all" is a whole-day request; see bookings.service.ts for cross-period conflict handling.
export const periodEnum = pgEnum("period", PERIODS);

// ---------------- Enum 2: Booking status ----------------
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

// ---------------- Enum 3: Booking purpose ----------------
export const purposeEnum = pgEnum("booking_purpose", PURPOSES);

// ---------------- Enum 4: Attendee gender ----------------
export const attendeeGenderEnum = pgEnum("attendee_gender", ATTENDEE_GENDERS);

// ---------------- Enum 5: Booking place ----------------
export const placeEnum = pgEnum("booking_place", PLACES);

// ---------------- Table 1: Admins ----------------
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Table 2: Bookings ----------------
// Which period(s) a booking reserves lives in bookingPeriods below, not here — one
// booking can now cover more than one period (e.g. morning + evening).
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingReference: text("booking_reference").notNull().unique(),
  eventDate: date("event_date").notNull(),
  hijriYear: smallint("hijri_year").notNull(),
  hijriMonth: smallint("hijri_month").notNull(),
  hijriDay: smallint("hijri_day").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  requesterName: text("requester_name").notNull(),
  requesterPhone: text("requester_phone").notNull(),
  purpose: purposeEnum("purpose").notNull(),
  // Only meaningful (and required by the API) when purpose = "other".
  purposeOther: text("purpose_other"),
  attendeeGender: attendeeGenderEnum("attendee_gender").notNull(),
  place: placeEnum("place").notNull(),
  // Only meaningful for a Fatiha booked by a male attendee — see bookings.service.ts.
  includeFemaleHall: boolean("include_female_hall").notNull().default(false),
  adminNote: text("admin_note"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Table 3: Booking periods ----------------
// One row per period a booking reserves — a whole-day booking is simply 3 rows, never
// its own stored "all" value. eventDate and status are copies of the parent booking's
// own columns (kept in sync in bookings.service.ts whenever status changes) so the
// uniqueness index below can enforce "no two active bookings share a date+period"
// with a plain partial index instead of needing a cross-table constraint.
export const bookingPeriods = pgTable(
  "booking_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    eventDate: date("event_date").notNull(),
    period: periodEnum("period").notNull(),
    status: bookingStatusEnum("status").notNull(),
  },
  (table) => [
    uniqueIndex("uq_booking_period_active_slot")
      .on(table.eventDate, table.period)
      .where(sql`${table.status} in ('pending', 'approved')`),
  ],
);

// ---------------- Table 3: Sessions ----------------
export const sessions = pgTable("sessions", {
  // The session token itself (also the cookie value) — not a generated uuid.
  id: text("id").primaryKey(),
  adminId: uuid("admin_id").notNull().references(() => admins.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Table 4: Blocked periods ----------------
export const blockedPeriods = pgTable("blocked_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  // Null period = the whole day is blocked, not just one period.
  period: periodEnum("period"),
  reason: text("reason"),
  blockedBy: uuid("blocked_by").notNull().references(() => admins.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Table 5: Hijri date overrides ----------------
// One correction per Gregorian date; dates without a row use the calculated mapping.
export const hijriDateOverrides = pgTable("hijri_date_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  gregorianDate: date("gregorian_date").notNull().unique(),
  hijriYear: smallint("hijri_year").notNull(),
  hijriMonth: smallint("hijri_month").notNull(),
  hijriDay: smallint("hijri_day").notNull(),
  // Forward anchors apply their calculated offset until a newer anchor supersedes them.
  applyForward: boolean("apply_forward").notNull().default(false),
  setBy: uuid("set_by").notNull().references(() => admins.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Table 6: Audit logs ----------------
// One row per admin action: approvals, rejections, blocks, and Hijri corrections.
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  entityId: text("entity_id"),
  adminId: uuid("admin_id").notNull().references(() => admins.id),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Table 7: Settings ----------------
// Flexible key/value store for booking limits and general config (e.g. max
// months ahead) — avoids a rigid schema/migration for every new setting.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => admins.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
