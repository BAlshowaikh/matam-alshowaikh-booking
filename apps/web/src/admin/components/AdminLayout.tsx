/*
  AdminLayout.tsx
  Renders shared admin navigation and content around the routed page.
*/

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { applyDocumentLanguage } from "../../i18n";
import logo from "../../assets/matam-logo-transparent.png";
import * as adminApi from "../adminApi";
import type { AdminIdentity } from "../adminApi";
import { useAdminText } from "../helpers";

// ---------------- Function 1: Administration navigation shell ----------------
export default function AdminLayout({ admin, onLogout, children }: { admin: AdminIdentity; onLogout: () => void; children: ReactNode }) {
  const c = useAdminText(); const { i18n } = useTranslation(); const navigate = useNavigate();

  // Keep navigation icons monochrome and consistently sized within the sidebar's compact icon column.
  const items: Array<[string, string, ReactNode]> = [["", c.dashboard, "⌂"], ["bookings", c.bookings, "▤"], ["blocked-periods", c.blocks, "⊘"], ["hijri-overrides", c.overrides, "☾"], ["admins", c.admins, <svg className="admin-nav-person" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="3.25" /><path d="M5.75 19c.55-3.55 2.65-5.35 6.25-5.35s5.7 1.8 6.25 5.35" /></svg>], ["audit-logs", c.audit, "≡"], ["settings", c.settings, "⚙"]];
  // ---------------- Method 1: End the authenticated session ----------------
  const signOut = async () => { await adminApi.logout().catch(() => undefined); onLogout(); navigate("/admin"); };

  // ---------------- Method 2: Toggle administration language ----------------
  const toggleLanguage = async () => { const next = i18n.language === "en" ? "ar" : "en"; await i18n.changeLanguage(next); applyDocumentLanguage(next); };

  // Keep navigation landmarks and button labels explicit for compact and assistive layouts.
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><img src={logo} alt="" /><div><strong>{c.admin}</strong><small>{admin.username}</small></div></div><nav aria-label={c.admin}>{items.map(([path, label, icon]) => { const destination = path ? `/admin/${path}` : "/admin"; return <NavLink end={path === ""} to={destination} key={path}><i aria-hidden="true">{icon}</i><span>{label}</span></NavLink>; })}</nav><div className="admin-sidebar-footer"><button type="button" aria-label={i18n.language === "en" ? "العربية" : "English"} onClick={toggleLanguage}>◎ <span>{i18n.language === "en" ? "العربية" : "English"}</span></button><Link to="/">↗ <span>{c.publicSite}</span></Link><button type="button" aria-label={c.logout} onClick={signOut}>⇥ <span>{c.logout}</span></button></div></aside><main id="main-content" className="admin-content" tabIndex={-1}>{children}</main></div>;
}
