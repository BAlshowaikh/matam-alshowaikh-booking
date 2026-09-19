/*
  BookingDetailsPage.tsx
  Renders booking review and private details.
*/

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import * as adminApi from "../adminApi";
import type { AdminBooking } from "../adminApi";
import AdminLoading from "../components/AdminLoading";
import AdminPage from "../components/AdminPage";
import { useConfirm, useToast } from "../../components/FeedbackProvider";
import Status from "../components/Status";
import { attendeeGenderLabel, formatDateTime, periodsLabel, placeLabel, purposeLabel, useAdminText } from "../helpers";

// ---------------- Function 1: Render the read-only booking detail list ----------------
function BookingDetailPanel({ booking }: { booking: AdminBooking }) {
  const c = useAdminText();
  const { i18n } = useTranslation();
  return <section className="admin-panel">
    <h2>{c.requester}</h2>
    <dl className="detail-list">
      <div><dt>{c.requester}</dt><dd>{booking.requesterName}</dd></div>
      <div><dt>{c.phone}</dt><dd dir="ltr">{booking.requesterPhone}</dd></div>
      <div><dt>{c.status}</dt><dd><Status status={booking.status} /></dd></div>
      <div><dt>{c.gregorianDate}</dt><dd>{booking.eventDate}</dd></div>
      <div><dt>{c.hijriDate}</dt><dd>{booking.hijriDay}/{booking.hijriMonth}/{booking.hijriYear}</dd></div>
      <div><dt>{c.period}</dt><dd>{periodsLabel(booking.periods, c)}</dd></div>
      <div><dt>{c.attendeeGender}</dt><dd>{attendeeGenderLabel(booking.attendeeGender, c)}</dd></div>
      <div><dt>{c.place}</dt><dd>{booking.purpose === "fatiha" && booking.attendeeGender === "male" ? c.allMaleHalls : placeLabel(booking.place, c)}{booking.includeFemaleHall && ` · ${c.plusFemaleHall}`}</dd></div>
      <div><dt>{c.purpose}</dt><dd>{purposeLabel(booking.purpose, c)}{booking.purpose === "other" && booking.purposeOther ? ` — ${booking.purposeOther}` : ""}</dd></div>
      <div><dt>{c.created}</dt><dd>{formatDateTime(booking.createdAt, i18n.language)}</dd></div>
    </dl>
  </section>;
}

// ---------------- Function 2: Render the review/reject/note actions panel ----------------
function BookingActionsPanel({ booking, reason, onReasonChange, note, onNoteChange, busy, message, onApprove, onReject, onSaveNote, onDelete }: {
  booking: AdminBooking;
  reason: string;
  onReasonChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  busy: boolean;
  message: string;
  onApprove: () => void;
  onReject: () => void;
  onSaveNote: () => void;
  onDelete: () => void;
}) {
  const c = useAdminText();
  return <section className="admin-panel">
    <h2>{c.actions}</h2>
    {booking.status === "pending" && <>
      <label>{c.rejectionReason}<textarea rows={3} value={reason} onChange={(event) => onReasonChange(event.target.value)} /></label>
      <div className="review-actions">
        <button className="approve-button" disabled={busy} onClick={onApprove}>{c.approve}</button>
        <button className="reject-button" disabled={busy} onClick={onReject}>{c.reject}</button>
      </div>
    </>}
    <label>{c.internalNote}<textarea rows={5} value={note} onChange={(event) => onNoteChange(event.target.value)} /></label>
    <button className="primary-button" disabled={busy} onClick={onSaveNote}>{busy ? c.saving : c.saveNote}</button>
    <p className="admin-message">{message}</p>
    <button className="danger-link booking-delete" disabled={busy} onClick={onDelete}>{c.remove}</button>
  </section>;
}

// ---------------- Function 3: Compose the booking details page ----------------
export default function BookingDetailsPage() {
  const c = useAdminText();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirmAction = useConfirm();
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => { try { const data = await adminApi.getBooking(id); setBooking(data); setNote(data.adminNote ?? ""); setReason(data.rejectionReason ?? ""); } catch { setMessage(c.genericError); } };
  useEffect(() => { void load(); }, [id]);

  const act = async (action: "approve" | "reject" | "note") => {
    if (action !== "note" && !await confirmAction(action === "approve" ? c.confirmApprove : c.confirmReject)) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "approve") await adminApi.approveBooking(id);
      else if (action === "reject") await adminApi.rejectBooking(id, reason);
      else await adminApi.saveBookingNote(id, note);
      notify(c.saved);
      await load();
    } catch {
      notify(c.genericError, "error");
    } finally {
      setBusy(false);
    }
  };

  // ---------------- Method 1: Permanently delete this booking ----------------
  const remove = async () => {
    if (!await confirmAction(c.confirmDelete)) return;
    setBusy(true);
    try {
      await adminApi.deleteBooking(id);
      notify(c.saved);
      navigate("/admin/bookings");
    } catch {
      notify(c.genericError, "error");
      setBusy(false);
    }
  };

  if (!booking) return <AdminPage title={c.bookings}><AdminLoading /><p className="error">{message}</p></AdminPage>;

  return <AdminPage title={booking.bookingReference} action={<button className="secondary-button" onClick={() => navigate(-1)}>{c.back}</button>}>
    <div className="booking-detail-grid">
      <BookingDetailPanel booking={booking} />
      <BookingActionsPanel
        booking={booking}
        reason={reason}
        onReasonChange={setReason}
        note={note}
        onNoteChange={setNote}
        busy={busy}
        message={message}
        onApprove={() => void act("approve")}
        onReject={() => void act("reject")}
        onSaveNote={() => void act("note")}
        onDelete={() => void remove()}
      />
    </div>
  </AdminPage>;
}
