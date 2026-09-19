/*
  BookingsPage.tsx
  Renders the filterable, paginated booking list.
*/

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { BookingStatus } from "../../types";
import * as adminApi from "../adminApi";
import type { AdminBooking } from "../adminApi";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import Status from "../components/Status";
import { useConfirm, useToast } from "../../components/FeedbackProvider";
import { formatDateTime, periodsLabel, useAdminText } from "../helpers";

type BookingFilters = { status: string; period: string; from: string; to: string };

const PAGE_SIZE = 10;

// ---------------- Function 1: Render the booking filter form ----------------
function BookingsFilterForm({ filters, onChange, onSubmit }: {
  filters: BookingFilters;
  onChange: (filters: BookingFilters) => void;
  onSubmit: () => void;
}) {
  const c = useAdminText();
  return <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <label>{c.status}<select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
      <option value="">{c.all}</option>
      {(["pending", "approved", "rejected", "cancelled"] as BookingStatus[]).map((value) => <option value={value} key={value}>{c[value]}</option>)}
    </select></label>
    <label>{c.period}<select value={filters.period} onChange={(event) => onChange({ ...filters, period: event.target.value })}>
      <option value="">{c.all}</option>
      <option value="morning">{c.morning}</option>
      <option value="afternoon">{c.afternoon}</option>
      <option value="evening">{c.evening}</option>
      <option value="all">{c.wholeDay}</option>
    </select></label>
    <label>{c.from}<input type="date" value={filters.from} onChange={(event) => onChange({ ...filters, from: event.target.value })} /></label>
    <label>{c.to}<input type="date" value={filters.to} onChange={(event) => onChange({ ...filters, to: event.target.value })} /></label>
    <button className="primary-button self-end w-full">{c.filter}</button>
  </form>;
}

// ---------------- Function 2: Render one booking row ----------------
function BookingRow({ row, onDelete }: { row: AdminBooking; onDelete: (row: AdminBooking) => void }) {
  const c = useAdminText();
  const { i18n } = useTranslation();
  return <tr>
    <td dir="ltr">{row.bookingReference}</td>
    <td><strong>{row.requesterName}</strong></td>
    <td dir="ltr">{row.requesterPhone}</td>
    <td>{row.eventDate}</td>
    <td>{periodsLabel(row.periods, c)}</td>
    <td><Status status={row.status} /></td>
    <td>{formatDateTime(row.createdAt, i18n.language)}</td>
    <td><Link className="table-action" to={`/admin/bookings/${row.id}`}>{c.view}</Link> <button className="danger-link" onClick={() => onDelete(row)}>{c.remove}</button></td>
  </tr>;
}

// ---------------- Function 3: Compose the bookings list page ----------------
export default function BookingsPage() {
  const c = useAdminText();
  const notify = useToast();
  const confirmAction = useConfirm();
  const [filters, setFilters] = useState<BookingFilters>({ status: "", period: "", from: "", to: "" });
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------- Helper 1: Load one booking page ----------------
  const load = async (nextPage = 0) => {
    setLoading(true);
    setError("");
    try {
      // Request one extra record so the pager knows whether a next page truly exists.
      const result = await adminApi.listBookings({ ...filters, limit: PAGE_SIZE + 1, offset: nextPage * PAGE_SIZE });
      setRows(result.slice(0, PAGE_SIZE));
      setHasNext(result.length > PAGE_SIZE);
      setPage(nextPage);
    } catch {
      setError(c.genericError);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  // ---------------- Helper 2: Remove a booking and retain a valid page ----------------
  const remove = async (row: AdminBooking) => {
    if (!await confirmAction(c.confirmDelete)) return;
    try {
      await adminApi.deleteBooking(row.id);
      notify(c.saved);
      await load(rows.length === 1 && page > 0 ? page - 1 : page);
    } catch {
      notify(c.genericError, "error");
    }
  };

  return <AdminPage title={c.bookings}>
    <BookingsFilterForm filters={filters} onChange={setFilters} onSubmit={() => void load()} />
    <p className="error">{error}</p>
    <AdminTable label={c.bookings} headers={[c.reference, c.requester, c.phone, c.date, c.period, c.status, c.created, c.actions]} loading={loading} empty={!rows.length} pagination={{ page, hasNext, onPageChange: (nextPage) => void load(nextPage) }}>
      {rows.map((row) => <BookingRow key={row.id} row={row} onDelete={remove} />)}
    </AdminTable>
  </AdminPage>;
}
