/*
  AdminTable.tsx
  Renders a responsive data table shared by every admin list page.
*/

import { Children, useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAdminText } from "../helpers";

type ServerPagination = {
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
};

type AdminTableProps = {
  label: string;
  headers: string[];
  children: ReactNode;
  loading?: boolean;
  empty: boolean;
  pageSize?: number;
  pagination?: ServerPagination;
};

// ---------------- Function 1: Responsive administration data table ----------------
export default function AdminTable({ label, headers, children, loading, empty, pageSize = 10, pagination }: AdminTableProps) {
  const c = useAdminText();
  const { i18n } = useTranslation();
  const headingId = useId();
  const rows = Children.toArray(children);
  const rowCount = empty ? 0 : rows.length;
  const [localPage, setLocalPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));
  const activePage = pagination?.page ?? localPage;
  const hasPrevious = activePage > 0;
  const hasNext = pagination?.hasNext ?? activePage < totalPages - 1;
  const showPagination = hasPrevious || hasNext;
  const paginationText = i18n.language === "en"
    ? { previous: "Previous page", next: "Next page", page: "Page" }
    : { previous: "الصفحة السابقة", next: "الصفحة التالية", page: "صفحة" };

  // Keep local pagination within range when a row is deleted or a filtered data set becomes shorter.
  useEffect(() => {
    if (!pagination && localPage >= totalPages) setLocalPage(totalPages - 1);
  }, [localPage, pagination, totalPages]);

  // Server-paginated tables supply one page; smaller tables are sliced locally from their complete result set.
  const visibleRows = pagination ? rows : rows.slice(activePage * pageSize, (activePage + 1) * pageSize);

  // ---------------- Helper 1: Move controlled or local pagination ----------------
  const changePage = (page: number) => pagination ? pagination.onPageChange(page) : setLocalPage(page);

  // Pair a compact table summary with a separately scrollable viewport so context stays visible on narrow screens.
  return <div className="admin-table-wrap">
    <div className="admin-table-toolbar">
      <div className="admin-table-title">
        <span className="admin-table-mark" aria-hidden="true"><i /><i /><i /></span>
        <strong id={headingId}>{label}</strong>
      </div>
      <span className="admin-table-count" aria-label={`${label}: ${rowCount}`} aria-live="polite">{rowCount}</span>
    </div>
    <div className="admin-table-viewport" role="region" aria-labelledby={headingId} tabIndex={0}>
      <table aria-busy={loading}>
        <thead><tr>{headers.map((header, index) => <th scope="col" key={`${header}-${index}`}>{header}</th>)}</tr></thead>
        <tbody>{loading
          ? <tr><td className="table-empty" colSpan={headers.length}><span className="spinner" aria-hidden="true" />{c.loading}</td></tr>
          : empty
            ? <tr><td className="table-empty" colSpan={headers.length}><span className="table-empty-mark" aria-hidden="true">◇</span>{c.noData}</td></tr>
            : visibleRows}</tbody>
      </table>
    </div>
    {showPagination && <nav className="admin-table-pagination" aria-label={`${label} ${paginationText.page}`}>
      <button type="button" disabled={!hasPrevious || loading} aria-label={paginationText.previous} onClick={() => changePage(activePage - 1)}><span aria-hidden="true">‹</span></button>
      <span><b>{paginationText.page}</b> {activePage + 1}{!pagination && ` / ${totalPages}`}</span>
      <button type="button" disabled={!hasNext || loading} aria-label={paginationText.next} onClick={() => changePage(activePage + 1)}><span aria-hidden="true">›</span></button>
    </nav>}
  </div>;
}
