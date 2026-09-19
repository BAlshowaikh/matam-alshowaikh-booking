/*
  AdminAccountsPage.tsx
  Renders administrator account management: create new admins and
  activate/deactivate existing ones.
*/

import { useEffect, useState, type FormEvent } from "react";
import * as adminApi from "../adminApi";
import type { AdminAccount } from "../adminApi";
import { ApiError } from "../../api";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import { useConfirm, useToast } from "../../components/FeedbackProvider";
import { formatDateTime, useAdminText } from "../helpers";

type CreateFormState = { username: string; password: string };

// ---------------- Function 1: Render the create-admin form ----------------
function CreateAdminForm({ form, onChange, onSubmit, message }: {
  form: CreateFormState;
  onChange: (form: CreateFormState) => void;
  onSubmit: (event: FormEvent) => void;
  message: string;
}) {
  const c = useAdminText();
  return <section className="admin-panel">
    <h2>{c.createAdmin}</h2>
    <form className="inline-admin-form" onSubmit={onSubmit}>
      <label>{c.username}<input autoComplete="off" required value={form.username} onChange={(event) => onChange({ ...form, username: event.target.value })} /></label>
      <label>{c.password}<input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(event) => onChange({ ...form, password: event.target.value })} /></label>
      <button className="primary-button self-end w-full">{c.createAdmin}</button>
    </form>
    <p className="admin-message">{message}</p>
  </section>;
}

// ---------------- Function 2: Render one admin account row ----------------
function AdminAccountRow({ row, isSelf, onToggle }: { row: AdminAccount; isSelf: boolean; onToggle: (row: AdminAccount) => void }) {
  const c = useAdminText();
  return <tr>
    <td dir="ltr">{row.username}</td>
    <td>{row.isActive ? c.active : c.inactive}</td>
    <td>{formatDateTime(row.createdAt, "en")}</td>
    <td>{isSelf
      ? "—"
      : <button className={row.isActive ? "danger-link" : ""} onClick={() => onToggle(row)}>{row.isActive ? c.deactivate : c.activate}</button>}</td>
  </tr>;
}

// ---------------- Function 3: Compose the admin accounts page ----------------
export default function AdminAccountsPage({ currentUsername }: { currentUsername: string }) {
  const c = useAdminText();
  const notify = useToast();
  const confirmAction = useConfirm();
  const [rows, setRows] = useState<AdminAccount[]>([]);
  const [form, setForm] = useState<CreateFormState>({ username: "", password: "" });
  const [message, setMessage] = useState("");

  const load = async () => { try { setRows(await adminApi.listAdmins()); } catch { setMessage(c.genericError); } };
  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await adminApi.createAdmin(form.username, form.password);
      notify(c.saved);
      setForm({ username: "", password: "" });
      await load();
    } catch (failure) {
      notify(failure instanceof ApiError && failure.code === "REQUEST_ERROR" ? c.usernameTaken : c.genericError, "error");
    }
  };

  const toggle = async (row: AdminAccount) => {
    if (row.isActive && !await confirmAction(c.confirmDeactivate)) return;
    try {
      await adminApi.setAdminActive(row.id, !row.isActive);
      notify(c.saved);
      await load();
    } catch {
      notify(c.genericError, "error");
    }
  };

  return <AdminPage title={c.admins}>
    <CreateAdminForm form={form} onChange={setForm} onSubmit={submit} message={message} />
    <AdminTable label={c.admins} headers={[c.username, c.status, c.created, c.actions]} empty={!rows.length}>
      {rows.map((row) => <AdminAccountRow key={row.id} row={row} isSelf={row.username === currentUsername} onToggle={toggle} />)}
    </AdminTable>
  </AdminPage>;
}
