/*
  AdminApp.tsx
  Authenticates the session and routes the administration area to its pages.
*/

import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import * as adminApi from "./adminApi";
import type { AdminIdentity } from "./adminApi";
import AdminLayout from "./components/AdminLayout";
import AdminLoading from "./components/AdminLoading";
import LoginPage from "./components/LoginPage";
import AdminAccountsPage from "./pages/AdminAccountsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import BlockedPeriodsPage from "./pages/BlockedPeriodsPage";
import BookingDetailsPage from "./pages/BookingDetailsPage";
import BookingsPage from "./pages/BookingsPage";
import DashboardPage from "./pages/DashboardPage";
import HijriOverridesPage from "./pages/HijriOverridesPage";
import SettingsPage from "./pages/SettingsPage";

// ---------------- Function 1: Authenticated administration application ----------------
export default function AdminApp() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [checking, setChecking] = useState(true);

  // Restore a valid cookie session before exposing protected pages.
  useEffect(() => { adminApi.getMe().then(setAdmin).catch(() => setAdmin(null)).finally(() => setChecking(false)); }, []);

  // Return to login immediately when any protected request reports an expired session.
  useEffect(() => { const expire = () => setAdmin(null); window.addEventListener("matam-admin-unauthorized", expire); return () => window.removeEventListener("matam-admin-unauthorized", expire); }, []);
  if (checking) return <AdminLoading />;
  if (!admin) return <LoginPage onLogin={setAdmin} />;
  // The root application owns feedback so toasts remain available across every route.
  return <AdminLayout admin={admin} onLogout={() => setAdmin(null)}><Routes><Route path="/admin" element={<DashboardPage />} /><Route path="/admin/bookings" element={<BookingsPage />} /><Route path="/admin/bookings/:id" element={<BookingDetailsPage />} /><Route path="/admin/blocked-periods" element={<BlockedPeriodsPage />} /><Route path="/admin/hijri-overrides" element={<HijriOverridesPage />} /><Route path="/admin/settings" element={<SettingsPage />} /><Route path="/admin/audit-logs" element={<AuditLogsPage />} /><Route path="/admin/admins" element={<AdminAccountsPage currentUsername={admin.username} />} /><Route path="*" element={<DashboardPage />} /></Routes></AdminLayout>;
}
