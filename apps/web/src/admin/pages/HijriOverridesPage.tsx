/*
  HijriOverridesPage.tsx
  Gives administrators a quick global Hijri-day adjustment and an advanced
  date-specific correction path, with manual corrections taking precedence.
*/

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import * as adminApi from "../adminApi";
import type { HijriAdjustment, HijriOverride } from "../adminApi";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import { useConfirm, useToast } from "../../components/FeedbackProvider";
import { DASHBOARD_TEXT, defaultRange, useAdminText } from "../helpers";

type OverrideFormState = { date: string; year: string; month: string; day: string; applyForward: boolean };

const ADJUSTMENT_VALUES: HijriAdjustment[] = [-2, -1, 0, 1, 2];

const PAGE_TEXT = {
  ar: {
    quickTitle: "التصحيح السريع",
    quickDescription: "أضف أو اطرح يوماً أو يومين من التاريخ الهجري المحسوب في جميع أنحاء النظام.",
    quickHelp: "استخدمه لمطابقة إعلان رؤية الهلال المعتمد. لا يغيّر طول الشهر ولا السجلات اليدوية.",
    advancedTitle: "التصحيح اليدوي المتقدم",
    advancedDescription: "اربط تاريخاً ميلادياً بتاريخ هجري محدد، مع إمكانية استمرار التصحيح للأيام التالية.",
    precedence: "عند وجود تصحيح يدوي لتاريخ ما، يُطبّق بدلاً من التصحيح السريع.",
    currentCorrections: "التصحيحات اليدوية الحالية",
    saveAdjustment: "حفظ التصحيح السريع",
    savingAdjustment: "جارٍ الحفظ...",
    minusTwo: "طرح يومين",
    minusOne: "طرح يوم واحد",
    noChange: "بدون تعديل",
    plusOne: "إضافة يوم واحد",
    plusTwo: "إضافة يومين",
  },
  en: {
    quickTitle: "Quick adjustment",
    quickDescription: "Add or subtract one or two days from every automatically calculated Hijri date.",
    quickHelp: "Use this to match the approved local moon-sighting announcement. It does not change month lengths or manual records.",
    advancedTitle: "Advanced manual correction",
    advancedDescription: "Map one Gregorian date to a specific Hijri date, with the option to continue that correction forward.",
    precedence: "When a manual correction covers a date, it is used instead of the quick adjustment.",
    currentCorrections: "Current manual corrections",
    saveAdjustment: "Save quick adjustment",
    savingAdjustment: "Saving...",
    minusTwo: "Subtract two days",
    minusOne: "Subtract one day",
    noChange: "No adjustment",
    plusOne: "Add one day",
    plusTwo: "Add two days",
  },
} as const;

// ---------------- Helper 1: Resolve a localized adjustment label ----------------
function adjustmentLabel(days: HijriAdjustment, labels: typeof PAGE_TEXT.en | typeof PAGE_TEXT.ar): string {
  const keys = { [-2]: "minusTwo", [-1]: "minusOne", [0]: "noChange", [1]: "plusOne", [2]: "plusTwo" } as const;
  return labels[keys[days]];
}

// ---------------- Function 1: Render the quick global adjustment ----------------
function QuickAdjustmentForm({ value, savedValue, saving, onChange, onSave }: {
  value: HijriAdjustment; savedValue: HijriAdjustment; saving: boolean;
  onChange: (value: HijriAdjustment) => void; onSave: () => void;
}) {
  const { i18n } = useTranslation();
  const labels = i18n.language === "en" ? PAGE_TEXT.en : PAGE_TEXT.ar;

  return <section className="admin-panel hijri-path-card quick-adjustment-card">
    <div className="hijri-path-heading">
      <span aria-hidden="true">±</span>
      <div><h2>{labels.quickTitle}</h2><p>{labels.quickDescription}</p></div>
    </div>
    <p className="hijri-path-help">{labels.quickHelp}</p>
    <div className="adjustment-options" role="radiogroup" aria-label={labels.quickTitle}>
      {ADJUSTMENT_VALUES.map((days) => <button key={days} type="button" role="radio" aria-checked={value === days} className={value === days ? "selected" : ""} onClick={() => onChange(days)}>
        <strong>{days > 0 ? `+${days}` : days}</strong><small>{adjustmentLabel(days, labels)}</small>
      </button>)}
    </div>
    <button className="primary-button adjustment-save" type="button" disabled={saving || value === savedValue} onClick={onSave}>
      {saving ? labels.savingAdjustment : labels.saveAdjustment}
    </button>
  </section>;
}

// ---------------- Function 2: Render the add/update manual correction form ----------------
function AddOverrideForm({ form, onChange, onSubmit, message }: {
  form: OverrideFormState; onChange: (form: OverrideFormState) => void;
  onSubmit: (event: FormEvent) => void; message: string;
}) {
  const c = useAdminText();
  const { i18n } = useTranslation();
  const dashboardLabels = i18n.language === "en" ? DASHBOARD_TEXT.en : DASHBOARD_TEXT.ar;
  const labels = i18n.language === "en" ? PAGE_TEXT.en : PAGE_TEXT.ar;

  return <section className="admin-panel hijri-path-card">
    <div className="hijri-path-heading">
      <span aria-hidden="true">✎</span>
      <div><h2>{labels.advancedTitle}</h2><p>{labels.advancedDescription}</p></div>
    </div>
    <p className="hijri-path-help">{labels.precedence}</p>
    <form className="inline-admin-form override-form" onSubmit={onSubmit}>
      <label>{c.gregorianDate}<input type="date" required value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} /></label>
      <label>{c.hijriYear}<input type="number" min="1300" max="1600" required value={form.year} onChange={(event) => onChange({ ...form, year: event.target.value })} /></label>
      <label>{c.hijriMonth}<input type="number" min="1" max="12" required value={form.month} onChange={(event) => onChange({ ...form, month: event.target.value })} /></label>
      <label>{c.hijriDay}<input type="number" min="1" max="30" required value={form.day} onChange={(event) => onChange({ ...form, day: event.target.value })} /></label>
      <button className="primary-button override-save-button">{c.save}</button>
      <label className="forward-toggle">
        <input type="checkbox" checked={form.applyForward} onChange={(event) => onChange({ ...form, applyForward: event.target.checked })} />
        <span><strong>{dashboardLabels.applyForward}</strong><small>{dashboardLabels.applyForwardHelp}</small></span>
      </label>
    </form>
    <p className="admin-message" role="status">{message}</p>
  </section>;
}

// ---------------- Function 3: Render one Hijri override row ----------------
function HijriOverrideRow({ row, onRemove }: { row: HijriOverride; onRemove: (date: string) => void }) {
  const c = useAdminText();
  return <tr>
    <td>{row.gregorianDate}</td><td>{row.hijriDay}/{row.hijriMonth}/{row.hijriYear}</td>
    <td>{row.applyForward ? "✓" : "—"}</td>
    <td><button className="danger-link" onClick={() => onRemove(row.gregorianDate)}>{c.remove}</button></td>
  </tr>;
}

// ---------------- Function 4: Compose the Hijri correction page ----------------
export default function HijriOverridesPage() {
  const c = useAdminText();
  const { i18n } = useTranslation();
  const dashboardLabels = i18n.language === "en" ? DASHBOARD_TEXT.en : DASHBOARD_TEXT.ar;
  const labels = i18n.language === "en" ? PAGE_TEXT.en : PAGE_TEXT.ar;
  const notify = useToast();
  const confirmAction = useConfirm();
  const range = useMemo(defaultRange, []);
  const [rows, setRows] = useState<HijriOverride[]>([]);
  const [form, setForm] = useState<OverrideFormState>({ date: range.from, year: "1448", month: "1", day: "1", applyForward: true });
  const [adjustment, setAdjustment] = useState<HijriAdjustment>(0);
  const [savedAdjustment, setSavedAdjustment] = useState<HijriAdjustment>(0);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [message, setMessage] = useState("");

  // ---------------- Helper 2: Load both Hijri correction paths ----------------
  const load = async () => {
    try {
      // Fetch independent settings concurrently so neither card delays the other unnecessarily.
      const [overrideRows, adjustmentSetting] = await Promise.all([adminApi.listOverrides(range.from, range.to), adminApi.getHijriAdjustment()]);
      setRows(overrideRows);
      setAdjustment(adjustmentSetting.days);
      setSavedAdjustment(adjustmentSetting.days);
      setMessage("");
    } catch {
      setMessage(c.genericError);
    }
  };

  // Load the server-backed values when this administration page first opens.
  useEffect(() => { void load(); }, []);

  // ---------------- Helper 3: Save a manual date correction ----------------
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      // Persist the correction, confirm success globally, and refresh the audit-facing list.
      await adminApi.saveOverride(form.date, Number(form.year), Number(form.month), Number(form.day), form.applyForward);
      notify(c.saved);
      await load();
    } catch {
      notify(c.genericError, "error");
    }
  };

  // ---------------- Helper 4: Remove a manual date correction ----------------
  const remove = async (date: string) => {
    // Destructive correction removal requires explicit confirmation.
    if (!await confirmAction(c.confirmDelete)) return;
    try {
      await adminApi.removeOverride(date);
      notify(c.saved);
      await load();
    } catch {
      notify(c.genericError, "error");
    }
  };

  // ---------------- Helper 5: Save the global quick adjustment ----------------
  const saveAdjustment = async () => {
    setSavingAdjustment(true);
    try {
      // Store the validated choice and update the comparison value that controls the save button.
      const saved = await adminApi.saveHijriAdjustment(adjustment);
      setAdjustment(saved.days);
      setSavedAdjustment(saved.days);
      notify(c.saved);
    } catch {
      notify(c.genericError, "error");
    } finally {
      setSavingAdjustment(false);
    }
  };

  return <AdminPage title={c.overrides}>
    <div className="hijri-correction-paths">
      <QuickAdjustmentForm value={adjustment} savedValue={savedAdjustment} saving={savingAdjustment} onChange={setAdjustment} onSave={saveAdjustment} />
      <AddOverrideForm form={form} onChange={setForm} onSubmit={submit} message={message} />
    </div>
    <section className="hijri-corrections-list" aria-labelledby="current-hijri-corrections">
      <h2 id="current-hijri-corrections">{labels.currentCorrections}</h2>
      <AdminTable label={labels.currentCorrections} headers={[c.gregorianDate, c.hijriDate, dashboardLabels.applyForward, c.actions]} empty={!rows.length}>
        {rows.map((row) => <HijriOverrideRow key={row.id} row={row} onRemove={remove} />)}
      </AdminTable>
    </section>
  </AdminPage>;
}
