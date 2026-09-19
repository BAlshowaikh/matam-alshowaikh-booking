/*
  adminApi.ts
  Defines admin data models and typed requests for every protected management endpoint.
*/

import type { AttendeeGender, BookingStatus, Period, Place, Purpose, SpecificPeriod } from "../types";
import { ApiError } from "../api";

// ---------------- Interface 1: Authenticated administrator ----------------
export interface AdminIdentity { username: string; }

// ---------------- Interface 2: Full administrative booking ----------------
export interface AdminBooking {
  id: string; bookingReference: string; eventDate: string; hijriYear: number; hijriMonth: number; hijriDay: number;
  periods: SpecificPeriod[]; status: BookingStatus; requesterName: string; requesterPhone: string;
  purpose: Purpose; purposeOther: string | null; attendeeGender: AttendeeGender; place: Place; includeFemaleHall: boolean;
  adminNote: string | null; rejectionReason: string | null; reviewedBy: string | null; reviewedAt: string | null;
  createdAt: string; updatedAt: string;
}

// ---------------- Interface 3: Administrative block ----------------
export interface BlockedPeriod { id: string; date: string; period: Period | null; reason: string | null; createdAt: string; }

// ---------------- Interface 4: Hijri correction ----------------
export interface HijriOverride { id: string; gregorianDate: string; hijriYear: number; hijriMonth: number; hijriDay: number; applyForward: boolean; createdAt: string; }

export type HijriAdjustment = -2 | -1 | 0 | 1 | 2;

// ---------------- Interface 5: Hijri quick adjustment ----------------
export interface HijriAdjustmentSetting { days: HijriAdjustment; }

// ---------------- Interface 6: Dashboard statistics ----------------
export interface DashboardSummary { totalCount: number; pendingCount: number; approvedCount: number; rejectedCount: number; upcomingApprovedCount: number; blockedUpcomingCount: number; recentRequests: AdminBooking[]; }

// ---------------- Interface 7: System setting ----------------
export interface AdminSetting { key: string; value: unknown; updatedAt: string; }

// ---------------- Interface 8: Audit entry ----------------
export interface AuditEntry { id: string; action: string; entityId: string | null; details: Record<string, unknown> | null; createdAt: string; adminId: string; adminUsername: string; }

// ---------------- Interface 9: Administrator account ----------------
export interface AdminAccount { id: string; username: string; isActive: boolean; createdAt: string; }

// ---------------- Helper 1: Parse an admin response ----------------
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", ...options, headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers });
  const payload = await response.json().catch(() => ({})) as T & { code?: string; error?: string };
  if (response.status === 401) window.dispatchEvent(new Event("matam-admin-unauthorized"));
  if (!response.ok) throw new ApiError(response.status === 401 ? "UNAUTHORIZED" : payload.code ?? "REQUEST_ERROR", payload.error ?? "Request failed");
  return payload;
}

// ---------------- Helper 2: Encode optional query parameters ----------------
function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

// ---------------- Function 1: Log in ----------------
export const login = (username: string, password: string) => request<AdminIdentity>("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) });
// ---------------- Function 2: Log out ----------------
export const logout = () => request<{ ok: true }>("/api/admin/logout", { method: "POST" });
// ---------------- Function 3: Read the current session ----------------
export const getMe = () => request<AdminIdentity>("/api/admin/me");
// ---------------- Function 4: Read dashboard totals ----------------
export const getDashboard = () => request<DashboardSummary>("/api/admin/dashboard");
// ---------------- Function 5: List bookings ----------------
export const listBookings = (filters: Record<string, string | number | undefined>) => request<AdminBooking[]>(`/api/admin/bookings${query(filters)}`);
// ---------------- Function 6: Read a booking ----------------
export const getBooking = (id: string) => request<AdminBooking>(`/api/admin/bookings/${id}`);
// ---------------- Function 7: Approve a booking ----------------
export const approveBooking = (id: string) => request<{ ok: true }>(`/api/admin/bookings/${id}/approve`, { method: "POST" });
// ---------------- Function 8: Reject a booking ----------------
export const rejectBooking = (id: string, reason: string) => request<{ ok: true }>(`/api/admin/bookings/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: reason || undefined }) });
// ---------------- Function 9: Save an internal note ----------------
export const saveBookingNote = (id: string, note: string) => request<{ ok: true }>(`/api/admin/bookings/${id}/note`, { method: "POST", body: JSON.stringify({ note }) });
// ---------------- Function 9b: Delete a booking ----------------
export const deleteBooking = (id: string) => request<{ ok: true }>(`/api/admin/bookings/${id}`, { method: "DELETE" });
// ---------------- Function 10: List blocked periods ----------------
export const listBlocks = (from: string, to: string) => request<BlockedPeriod[]>(`/api/admin/blocked-periods${query({ from, to })}`);
// ---------------- Function 11: Create a blocked period ----------------
export const createBlock = (input: { date: string; period?: SpecificPeriod; reason?: string }) => request<BlockedPeriod>("/api/admin/blocked-periods", { method: "POST", body: JSON.stringify(input) });
// ---------------- Function 12: Remove a blocked period ----------------
export const removeBlock = (id: string) => request<{ ok: true }>(`/api/admin/blocked-periods/${id}`, { method: "DELETE" });
// ---------------- Function 13: List Hijri corrections ----------------
export const listOverrides = (from: string, to: string) => request<HijriOverride[]>(`/api/admin/hijri-overrides${query({ from, to })}`);
// ---------------- Function 14: Save a Hijri correction ----------------
export const saveOverride = (date: string, hijriYear: number, hijriMonth: number, hijriDay: number, applyForward: boolean) => request<HijriOverride>(`/api/admin/hijri-overrides/${date}`, { method: "PUT", body: JSON.stringify({ hijriYear, hijriMonth, hijriDay, applyForward }) });
// ---------------- Function 15: Remove a Hijri correction ----------------
export const removeOverride = (date: string) => request<{ ok: true }>(`/api/admin/hijri-overrides/${date}`, { method: "DELETE" });
// ---------------- Function 16: Read the global Hijri adjustment ----------------
export const getHijriAdjustment = () => request<HijriAdjustmentSetting>("/api/admin/hijri-adjustment");
// ---------------- Function 17: Save the global Hijri adjustment ----------------
export const saveHijriAdjustment = (days: HijriAdjustment) => request<HijriAdjustmentSetting>("/api/admin/hijri-adjustment", { method: "PUT", body: JSON.stringify({ days }) });
// ---------------- Function 18: List settings ----------------
export const listSettings = () => request<AdminSetting[]>("/api/admin/settings");
// ---------------- Function 19: Save a setting ----------------
export const saveSetting = (key: string, value: unknown) => request<AdminSetting>(`/api/admin/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) });
// ---------------- Function 20: List audit history ----------------
export const listAuditLogs = (filters: Record<string, string | number | undefined>) => request<AuditEntry[]>(`/api/admin/audit-logs${query(filters)}`);
// ---------------- Function 21: List admin accounts ----------------
export const listAdmins = () => request<AdminAccount[]>("/api/admin/admins");
// ---------------- Function 22: Create an admin account ----------------
export const createAdmin = (username: string, password: string) => request<AdminAccount>("/api/admin/admins", { method: "POST", body: JSON.stringify({ username, password }) });
// ---------------- Function 23: Activate or deactivate an admin account ----------------
export const setAdminActive = (id: string, isActive: boolean) => request<AdminAccount>(`/api/admin/admins/${id}/${isActive ? "activate" : "deactivate"}`, { method: "POST" });
