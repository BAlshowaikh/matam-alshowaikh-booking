/*
  Header.tsx
  Renders the branded public site header with the language toggle.
*/

import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { applyDocumentLanguage } from "../../i18n";
import logo from "../../assets/matam-logo-transparent.png";

// ---------------- Function 1: Public site header ----------------
export default function Header() {
  const { t, i18n } = useTranslation();

  // ---------------- Method 1: Toggle public-site language ----------------
  const toggleLanguage = async () => {
    // Switch content and document direction together, then persist the selection.
    const next = i18n.language === "en" ? "ar" : "en";
    await i18n.changeLanguage(next);
    applyDocumentLanguage(next);
  };

  // Mark the tracking route as current and avoid repeating adjacent brand text to screen readers.
  return <header className="site-header"><Link className="brand" to="/"><img src={logo} alt="" /><span>{t("brand")}</span></Link><nav aria-label={t("primaryNavigation")}><NavLink className={({ isActive }) => `status-link ${isActive ? "active" : ""}`} to="/lookup">{t("lookup")}</NavLink><button type="button" className="language-button" onClick={toggleLanguage}>{t("language")}</button></nav></header>;
}
