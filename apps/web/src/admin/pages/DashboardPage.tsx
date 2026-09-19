/*
  DashboardPage.tsx
  Renders an action-focused administration overview with pending work,
  quick navigation, useful totals, and the newest booking requests.
*/

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import * as adminApi from "../adminApi";
import type { AdminBooking, DashboardSummary } from "../adminApi";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import Status from "../components/Status";
import { DASHBOARD_TEXT, useAdminText } from "../helpers";

// ---------------- Function 1: Highlight work awaiting review ----------------
function DashboardAttention({ pendingCount }: { pendingCount?: number }) {
  const c = useAdminText();

  // Make the primary daily task the strongest element and provide a direct route to it.
  return <article className="dashboard-attention">
    <div>
      <span>{c.pendingRequests}</span>
      <strong>{pendingCount ?? "—"}</strong>
    </div>
    <Link to="/admin/bookings">{c.manageBookings}<b aria-hidden="true">→</b></Link>
  </article>;
}

// ---------------- Function 2: Render operational summary metrics ----------------
function DashboardMetrics({ summary }: { summary: DashboardSummary | null }) {
  const { i18n } = useTranslation();
  const labels = i18n.language === "en" ? DASHBOARD_TEXT.en : DASHBOARD_TEXT.ar;
  const metrics = [
    [labels.upcoming, summary?.upcomingApprovedCount, "calendar"],
    [labels.blocked, summary?.blockedUpcomingCount, "blocked"],
    [labels.approved, summary?.approvedCount, "approved"],
    [labels.total, summary?.totalCount, "total"],
  ] as const;

  // Keep secondary totals compact so they support rather than dominate the pending-work card.
  return <div className="dashboard-metrics dashboard-metrics-compact">
    {metrics.map(([label, value, tone]) => <article className={`metric-card dashboard-metric-${tone}`} key={label}>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </article>)}
  </div>;
}

// ---------------- Function 3: Render common administration shortcuts ----------------
function DashboardQuickActions() {
  const c = useAdminText();
  const actions = [
    ["/admin/bookings", "▤", c.manageBookings],
    ["/admin/blocked-periods", "⊘", c.addBlock],
    ["/admin/hijri-overrides", "☾", c.addOverride],
  ] as const;

  // Offer direct navigation to the three tasks most likely to start from the dashboard.
  return <section className="dashboard-quick-actions" aria-label={c.actions}>
    {actions.map(([path, icon, label]) => <Link to={path} key={path}>
      <i aria-hidden="true">{icon}</i>
      <span>{label}</span>
      <b aria-hidden="true">→</b>
    </Link>)}
  </section>;
}

// ---------------- Function 4: Render a recent booking row ----------------
function RecentBookingRow({ booking }: { booking: AdminBooking }) {
  const c = useAdminText();

  // Show only decision-relevant fields and leave the complete record to its detail page.
  return <tr>
    <td dir="ltr"><strong>{booking.bookingReference}</strong></td>
    <td>{booking.requesterName}</td>
    <td>{booking.eventDate}</td>
    <td><Status status={booking.status} /></td>
    <td><Link className="table-action" to={`/admin/bookings/${booking.id}`}>{c.view}</Link></td>
  </tr>;
}

// ---------------- Function 5: Compose the dashboard page ----------------
export default function DashboardPage() {
  const c = useAdminText();
  const { i18n } = useTranslation();
  const labels = i18n.language === "en" ? DASHBOARD_TEXT.en : DASHBOARD_TEXT.ar;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  // Load the single dashboard payload that already contains metrics and recent requests.
  useEffect(() => {
    adminApi.getDashboard().then(setSummary).catch(() => setError(c.genericError));
  }, [c]);

  // Arrange urgent work first, supporting navigation second, and recent context last.
  return <AdminPage title={c.dashboard}>
    <div className="dashboard-command-grid">
      <DashboardAttention pendingCount={summary?.pendingCount} />
      <DashboardQuickActions />
    </div>
    <DashboardMetrics summary={summary} />
    {error && <p className="error dashboard-error">{error}</p>}
    <div className="recent-panel">
      <AdminTable
        label={labels.recent}
        headers={[c.reference, c.requester, c.date, c.status, c.actions]}
        loading={!summary && !error}
        empty={!summary?.recentRequests.length}
      >
        {summary?.recentRequests.map((booking) => <RecentBookingRow booking={booking} key={booking.id} />)}
      </AdminTable>
    </div>
  </AdminPage>;
}
