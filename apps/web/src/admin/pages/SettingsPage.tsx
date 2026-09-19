/*
  SettingsPage.tsx
  Renders system settings.
*/

import { useEffect, useState, type FormEvent } from "react";
import * as adminApi from "../adminApi";
import type { AdminSetting } from "../adminApi";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import { useToast } from "../../components/FeedbackProvider";
import { formatDateTime, useAdminText } from "../helpers";

// ---------------- Function 1: Render the advance-booking-limit form ----------------
function BookingLimitForm({ months, onChange, onSubmit, message }: {
  months: string;
  onChange: (months: string) => void;
  onSubmit: (event: FormEvent) => void;
  message: string;
}) {
  const c = useAdminText();
  return <section className="admin-panel setting-card">
    <h2>{c.bookingLimit}</h2>
    <p>{c.bookingLimitHelp}</p>
    <form onSubmit={onSubmit}>
      <label>{c.months}<input type="number" min="1" max="60" value={months} onChange={(event) => onChange(event.target.value)} /></label>
      <button className="primary-button">{c.save}</button>
    </form>
    <p className="admin-message">{message}</p>
  </section>;
}

// ---------------- Function 2: Render one setting row ----------------
function SettingRow({ setting }: { setting: AdminSetting }) {
  return <tr>
    <td dir="ltr">{setting.key}</td>
    <td>{JSON.stringify(setting.value)}</td>
    <td>{formatDateTime(setting.updatedAt, "en")}</td>
  </tr>;
}

// ---------------- Function 3: Compose the settings page ----------------
export default function SettingsPage() {
  const c = useAdminText();
  const notify = useToast();
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [months, setMonths] = useState("12");
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminApi.listSettings().then((rows) => {
      setSettings(rows);
      const limit = rows.find((row) => row.key === "booking_max_months_ahead");
      if (typeof limit?.value === "number") setMonths(String(limit.value));
    }).catch(() => setMessage(c.genericError));
  }, [c]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await adminApi.saveSetting("booking_max_months_ahead", Number(months));
      notify(c.saved);
      setSettings(await adminApi.listSettings());
    } catch {
      notify(c.genericError, "error");
    }
  };

  return <AdminPage title={c.settings}>
    <BookingLimitForm months={months} onChange={setMonths} onSubmit={submit} message={message} />
    <AdminTable label={c.settings} headers={[c.settingKey, c.settingValue, c.updated]} empty={!settings.length}>
      {settings.map((setting) => <SettingRow key={setting.key} setting={setting} />)}
    </AdminTable>
  </AdminPage>;
}
