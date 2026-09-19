/*
  AuditLogsPage.tsx
  Renders the audit trail.
*/

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as adminApi from "../adminApi";
import type { AuditEntry } from "../adminApi";
import AdminPage from "../components/AdminPage";
import AdminTable from "../components/AdminTable";
import { formatDateTime, useAdminText } from "../helpers";

const PAGE_SIZE = 10;

// ---------------- Function 1: Render the action filter form ----------------
function AuditFilterForm({ action, onChange, onSubmit }: {
  action: string;
  onChange: (action: string) => void;
  onSubmit: () => void;
}) {
  const c = useAdminText();
  return <form className="admin-filters audit-filter" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <label>{c.action}<input value={action} onChange={(event) => onChange(event.target.value)} /></label>
    <button className="primary-button">{c.filter}</button>
  </form>;
}

// ---------------- Function 2: Render one audit-log row ----------------
function AuditLogRow({ row }: { row: AuditEntry }) {
  const { i18n } = useTranslation();
  return <tr>
    <td dir="ltr">{row.action}</td>
    <td>{row.adminUsername}</td>
    <td dir="ltr">{row.entityId || "—"}</td>
    <td><code>{row.details ? JSON.stringify(row.details) : "—"}</code></td>
    <td>{formatDateTime(row.createdAt, i18n.language)}</td>
  </tr>;
}

// ---------------- Function 3: Compose the audit logs page ----------------
export default function AuditLogsPage() {
  const c = useAdminText();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---------------- Helper 1: Load one audit-history page ----------------
  const load = async (nextPage = 0) => {
    setLoading(true);
    try {
      // Request one extra record so the pager never opens an empty trailing page.
      const result = await adminApi.listAuditLogs({ action: action || undefined, limit: PAGE_SIZE + 1, offset: nextPage * PAGE_SIZE });
      setRows(result.slice(0, PAGE_SIZE));
      setHasNext(result.length > PAGE_SIZE);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  return <AdminPage title={c.audit}>
    <AuditFilterForm action={action} onChange={setAction} onSubmit={() => void load()} />
    <AdminTable label={c.audit} headers={[c.action, c.administrator, c.entity, c.details, c.created]} loading={loading} empty={!rows.length} pagination={{ page, hasNext, onPageChange: (nextPage) => void load(nextPage) }}>
      {rows.map((row) => <AuditLogRow key={row.id} row={row} />)}
    </AdminTable>
  </AdminPage>;
}
