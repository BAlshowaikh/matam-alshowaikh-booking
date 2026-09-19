/*
  AdminPage.tsx
  Renders a shared admin page heading.
*/

import type { ReactNode } from "react";
import { useAdminText } from "../helpers";

export default function AdminPage({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const c = useAdminText();
  return <><header className="admin-page-header"><div><span className="eyebrow">{c.admin}</span><h1>{title}</h1></div>{action}</header>{children}</>;
}
