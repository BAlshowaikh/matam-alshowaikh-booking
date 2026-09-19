/*
  bookings.service.ts (admin)
  Database queries and business logic for admin-side booking management:
  listing/filtering, viewing full detail, approving, and rejecting.
*/

import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, blockedPeriods, bookings, bookingPeriods } from "@matam/db";
import type { Period, SpecificPeriod } from "@matam/shared";
import { recordAuditLog } from "../../../helpers/audit-log.js";

type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface BookingFilters {
  status?: BookingStatus;
  period?: Period;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

// ---------------- Helper 1: Attach each booking's period list ----------------
// One follow-up query batched across every row, rather than one query per booking.
async function attachPeriods<T extends { id: string }>(rows: T[]): Promise<(T & { periods: SpecificPeriod[] })[]> {
  if (rows.length === 0) return [];
  const periodRows = await db
    .select({ bookingId: bookingPeriods.bookingId, period: bookingPeriods.period })
    .from(bookingPeriods)
    .where(inArray(bookingPeriods.bookingId, rows.map((row) => row.id)));

  const periodsByBooking = new Map<string, SpecificPeriod[]>();
  for (const row of periodRows) {
    // The app never inserts "all" into booking_periods, so this narrowing always holds.
    const list = periodsByBooking.get(row.bookingId) ?? [];
    list.push(row.period as SpecificPeriod);
    periodsByBooking.set(row.bookingId, list);
  }
  return rows.map((row) => ({ ...row, periods: periodsByBooking.get(row.id) ?? [] }));
}

// ---------------- Function 1: List bookings (admin view, full detail) ----------------
// Oldest-pending-first by default, so the admin naturally works through the queue in order.
export async function listBookings(filters: BookingFilters) {
  const conditions = [];
  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.period) {
    // "all" still means "filter to whole-day bookings" — those hold all three period rows.
    const matchPeriods = filters.period === "all" ? (["morning", "afternoon", "evening"] as const) : [filters.period];
    conditions.push(
      inArray(
        bookings.id,
        db.select({ id: bookingPeriods.bookingId }).from(bookingPeriods).where(inArray(bookingPeriods.period, matchPeriods)),
      ),
    );
  }
  if (filters.from) conditions.push(gte(bookings.eventDate, filters.from));
  if (filters.to) conditions.push(lte(bookings.eventDate, filters.to));

  const rows = await db
    .select()
    .from(bookings)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      sql`case when ${bookings.status} = 'pending' then 0 else 1 end`,
      asc(bookings.createdAt),
      desc(bookings.updatedAt),
    )
    .limit(filters.limit)
    .offset(filters.offset);
  return attachPeriods(rows);
}

// ---------------- Function 2: Get one booking's full detail ----------------
export async function getBookingById(id: string) {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!row) return null;
  const [withPeriods] = await attachPeriods([row]);
  return withPeriods;
}

export type ReviewResult = "ok" | "not_found" | "not_pending";

// ---------------- Function 3: Approve a pending booking ----------------
// Only succeeds from "pending" — guards against two admin tabs double-processing the same row.
export async function approveBooking(id: string, adminId: string): Promise<ReviewResult> {
  const existing = await getBookingById(id);
  if (!existing) return "not_found";
  if (existing.status !== "pending") return "not_pending";

  // booking_periods.status is a denormalized copy kept in sync here so its own
  // partial unique index continues to enforce "no overlapping active periods".
  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({ status: "approved", reviewedBy: adminId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(bookings.id, id));
    await tx.update(bookingPeriods).set({ status: "approved" }).where(eq(bookingPeriods.bookingId, id));
  });
  await recordAuditLog("booking_approved", adminId, id);
  return "ok";
}

// ---------------- Function 4: Reject a pending booking ----------------
export async function rejectBooking(
  id: string,
  adminId: string,
  reason: string | undefined,
): Promise<ReviewResult> {
  const existing = await getBookingById(id);
  if (!existing) return "not_found";
  if (existing.status !== "pending") return "not_pending";

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id));
    await tx.update(bookingPeriods).set({ status: "rejected" }).where(eq(bookingPeriods.bookingId, id));
  });
  await recordAuditLog("booking_rejected", adminId, id, { reason });
  return "ok";
}

// ---------------- Function 5: Set a booking's internal admin note ----------------
export async function setBookingNote(id: string, note: string, adminId: string): Promise<ReviewResult> {
  const existing = await getBookingById(id);
  if (!existing) return "not_found";

  await db.update(bookings).set({ adminNote: note, updatedAt: new Date() }).where(eq(bookings.id, id));
  await recordAuditLog("booking_note_set", adminId, id);
  return "ok";
}

// ---------------- Function 6: Permanently delete a booking ----------------
// booking_periods rows cascade automatically (see the FK in schema.ts). The audit log
// records the booking's reference/date directly since the row itself won't exist to
// look up afterward.
export async function deleteBooking(id: string, adminId: string): Promise<ReviewResult> {
  const existing = await getBookingById(id);
  if (!existing) return "not_found";

  await db.delete(bookings).where(eq(bookings.id, id));
  await recordAuditLog("booking_deleted", adminId, id, {
    bookingReference: existing.bookingReference,
    eventDate: existing.eventDate,
  });
  return "ok";
}

// ---------------- Function 7: Count pending bookings ----------------
// Backs the admin dashboard's pending-request count.
export async function countPendingBookings(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(bookings).where(eq(bookings.status, "pending"));
  return row?.value ?? 0;
}

// ---------------- Function 8: Build dashboard statistics ----------------
// Combines status totals, future commitments, active blocks, and the newest requests.
export async function getDashboardSummary() {
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
  const today = `${values.year}-${values.month}-${values.day}`;

  // Aggregate booking states in one query to keep the dashboard inexpensive as data grows.
  const [totals] = await db.select({
    totalCount: count(),
    pendingCount: sql<number>`count(*) filter (where ${bookings.status} = 'pending')`.mapWith(Number),
    approvedCount: sql<number>`count(*) filter (where ${bookings.status} = 'approved')`.mapWith(Number),
    rejectedCount: sql<number>`count(*) filter (where ${bookings.status} = 'rejected')`.mapWith(Number),
    upcomingApprovedCount: sql<number>`count(*) filter (where ${bookings.status} = 'approved' and ${bookings.eventDate} >= ${today})`.mapWith(Number),
  }).from(bookings);

  // Count future administrative blocks separately because they live outside booking records.
  const [blocks] = await db.select({ value: count() }).from(blockedPeriods).where(gte(blockedPeriods.date, today));
  const recentRows = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(5);
  const recentRequests = await attachPeriods(recentRows);
  return { ...totals, blockedUpcomingCount: blocks?.value ?? 0, recentRequests };
}
