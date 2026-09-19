/*
  BlockedPeriodsPage.tsx
  Renders blocked-period management.
*/

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { getCalendar, getCalendarWindow } from "../../api";
import type { CalendarDay, SpecificPeriod } from "../../types";
import * as adminApi from "../adminApi";
import type { BlockedPeriod } from "../adminApi";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import { useConfirm, useToast } from "../../components/FeedbackProvider";
import { ADMIN_HIJRI_MONTHS, DASHBOARD_TEXT, adminWeekdays, defaultRange, periodLabel, useAdminText } from "../helpers";

type BlockFormState = { date: string; period: string; reason: string };

// ---------------- Function 1: Render the mini calendar used to pick a block date ----------------
function BlockCalendar({ mode, onModeChange, heading, onMoveMonth, days, selectedDate, onSelectDate }: {
  mode: "gregorian" | "hijri";
  onModeChange: (mode: "gregorian" | "hijri") => void;
  heading: string;
  onMoveMonth: (amount: number) => void;
  days: CalendarDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { i18n } = useTranslation();
  const labels = i18n.language === "en" ? DASHBOARD_TEXT.en : DASHBOARD_TEXT.ar;
  const weekdays = adminWeekdays(i18n.language);
  const firstOffset = days.length ? (new Date(`${days[0].date}T12:00:00`).getDay() + 1) % 7 : 0;
  return <section className="admin-panel admin-calendar-panel">
    <div className="calendar-mode-switch">
      <button className={mode === "gregorian" ? "active" : ""} onClick={() => onModeChange("gregorian")}>{labels.calendarGregorian}</button>
      <button className={mode === "hijri" ? "active" : ""} onClick={() => onModeChange("hijri")}>{labels.calendarHijri}</button>
    </div>
    <div className="admin-calendar-head">
      <button onClick={() => onMoveMonth(-1)}>‹</button>
      <h2>{heading}</h2>
      <button onClick={() => onMoveMonth(1)}>›</button>
    </div>
    <div className="admin-mini-calendar">
      {weekdays.map((day) => <b key={day}>{day}</b>)}
      {Array.from({ length: firstOffset }, (_, index) => <span key={index} />)}
      {days.map((day) => <button className={selectedDate === day.date ? "selected" : ""} onClick={() => onSelectDate(day.date)} key={day.date}>
        <strong>{mode === "hijri" ? day.hijri.day : Number(day.date.slice(-2))}</strong>
        <small>{mode === "hijri" ? day.date.slice(5) : `${day.hijri.day}/${day.hijri.month}`}</small>
        <i><em className={day.periods.morning} /><em className={day.periods.afternoon} /><em className={day.periods.evening} /></i>
      </button>)}
    </div>
  </section>;
}

// ---------------- Function 2: Render the add-block form ----------------
function AddBlockForm({ form, onChange, onSubmit, message }: {
  form: BlockFormState;
  onChange: (form: BlockFormState) => void;
  onSubmit: (event: FormEvent) => void;
  message: string;
}) {
  const c = useAdminText();
  return <section className="admin-panel">
    <h2>{c.addBlock}</h2>
    <form className="inline-admin-form" onSubmit={onSubmit}>
      <label>{c.date}<input type="date" required value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} /></label>
      <label>{c.period}<select value={form.period} onChange={(event) => onChange({ ...form, period: event.target.value })}>
        <option value="">{c.wholeDay}</option>
        <option value="morning">{c.morning}</option>
        <option value="afternoon">{c.afternoon}</option>
        <option value="evening">{c.evening}</option>
      </select></label>
      <label>{c.reason}<input value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} /></label>
      <button className="primary-button self-end w-full">{c.block}</button>
    </form>
    <p className="admin-message">{message}</p>
  </section>;
}

// ---------------- Function 3: Render one blocked-period row ----------------
function BlockedPeriodRow({ row, onRemove }: { row: BlockedPeriod; onRemove: (id: string) => void }) {
  const c = useAdminText();
  return <tr>
    <td>{row.date}</td>
    <td>{row.period ? periodLabel(row.period, c) : c.wholeDay}</td>
    <td>{row.reason || "—"}</td>
    <td><button className="danger-link" onClick={() => onRemove(row.id)}>{c.unblock}</button></td>
  </tr>;
}

// ---------------- Function 4: Compose the blocked-periods page ----------------
export default function BlockedPeriodsPage() {
  const c = useAdminText();
  const { i18n } = useTranslation();
  const notify = useToast();
  const confirmAction = useConfirm();
  const range = useMemo(defaultRange, []);
  const listRange = useMemo(() => ({ ...range, from: `${range.from.slice(0, 7)}-01` }), [range]);
  const [rows, setRows] = useState<BlockedPeriod[]>([]);
  const [form, setForm] = useState<BlockFormState>({ date: range.from, period: "", reason: "" });
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarMode, setCalendarMode] = useState<"gregorian" | "hijri">("gregorian");

  // ---------------- Helper 1: Load manageable blocks including earlier days in the current month ----------------
  const load = async () => { try { setRows(await adminApi.listBlocks(listRange.from, listRange.to)); } catch { setMessage(c.genericError); } };

  // ---------------- Helper 2: Load availability for the displayed calendar ----------------
  const loadCalendar = async () => { const result = calendarMode === "gregorian" ? await getCalendar(month.getFullYear(), month.getMonth() + 1) : await getCalendarWindow(month); setCalendarDays(result); };
  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadCalendar().catch(() => setMessage(c.genericError)); }, [month, calendarMode, c]);

  // ---------------- Helper 3: Create a blocked period ----------------
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await adminApi.createBlock({ date: form.date, period: (form.period as SpecificPeriod) || undefined, reason: form.reason || undefined });
      notify(c.saved);
      await load();
      await loadCalendar();
    } catch {
      notify(c.genericError, "error");
    }
  };

  // ---------------- Helper 4: Remove a blocked period ----------------
  const remove = async (id: string) => {
    if (!await confirmAction(c.confirmDelete)) return;
    try {
      await adminApi.removeBlock(id);
      notify(c.saved);
      await load();
      await loadCalendar();
    } catch {
      notify(c.genericError, "error");
    }
  };

  const focusDay = calendarDays.find((day) => day.date === month.toISOString().slice(0, 10)) ?? calendarDays[Math.floor(calendarDays.length / 2)];
  const displayDays = calendarMode === "hijri" && focusDay ? calendarDays.filter((day) => day.hijri.year === focusDay.hijri.year && day.hijri.month === focusDay.hijri.month) : calendarDays;
  const moveMonth = (amount: number) => setMonth(calendarMode === "gregorian" ? new Date(month.getFullYear(), month.getMonth() + amount, 1) : new Date(month.getFullYear(), month.getMonth(), month.getDate() + amount * 29));
  const heading = calendarMode === "hijri" && focusDay
    ? `${ADMIN_HIJRI_MONTHS[i18n.language === "en" ? "en" : "ar"][focusDay.hijri.month - 1]} ${focusDay.hijri.year}`
    : new Intl.DateTimeFormat(i18n.language === "en" ? "en-GB" : "ar-BH", { month: "long", year: "numeric" }).format(month);

  return <AdminPage title={c.blocks}>
    <BlockCalendar
      mode={calendarMode}
      onModeChange={setCalendarMode}
      heading={heading}
      onMoveMonth={moveMonth}
      days={displayDays}
      selectedDate={form.date}
      onSelectDate={(date) => setForm({ ...form, date })}
    />
    <AddBlockForm form={form} onChange={setForm} onSubmit={submit} message={message} />
    <AdminTable label={c.blocks} headers={[c.date, c.period, c.reason, c.actions]} empty={!rows.length}>
      {rows.map((row) => <BlockedPeriodRow key={row.id} row={row} onRemove={remove} />)}
    </AdminTable>
  </AdminPage>;
}
