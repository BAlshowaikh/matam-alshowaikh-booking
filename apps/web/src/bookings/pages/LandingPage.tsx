/*
  LandingPage.tsx
  Renders the guest-or-admin entry experience.
*/

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { applyDocumentLanguage } from "../../i18n";
import logo from "../../assets/matam-logo-transparent.png";

const LANDING_COPY = {
  ar: { title: "نظام حجوزات مأتم الشويخ", guest: "المتابعة كزائر", guestHelp: "حجز المأتم أو متابعة طلب سابق", admin: "المتابعة كإداري", adminHelp: "الدخول إلى لوحة الإدارة", language: "English" },
  en: { title: "Matam Al-Showaikh Booking System", guest: "Continue as guest", guestHelp: "Book the Matam or track an existing request", admin: "Continue as admin", adminHelp: "Sign in to the administration dashboard", language: "العربية" },
} as const;

// ---------------- Function 1: Guest and administration entry page ----------------
export default function LandingPage() {
  const { i18n } = useTranslation();
  const copy = i18n.language === "en" ? LANDING_COPY.en : LANDING_COPY.ar;

  // ---------------- Method 1: Toggle the entry language ----------------
  const toggleLanguage = async () => {
    // Keep language selection available before a visitor chooses either application area.
    const next = i18n.language === "en" ? "ar" : "en";
    await i18n.changeLanguage(next);
    applyDocumentLanguage(next);
  };

  // Introduce the brand before offering clearly separated guest and staff paths.
  return <main id="main-content" className="entry-page" tabIndex={-1}>
    <button type="button" className="entry-language" onClick={toggleLanguage}>{copy.language}</button>
    <section className="entry-content" aria-labelledby="entry-title">
      <div className="entry-visual"><div className="entry-glow" aria-hidden="true" /><div className="entry-logo-wrap"><img src={logo} alt="" /></div></div>
      <div className="entry-copy"><span className="entry-ornament" aria-hidden="true">◆</span><h1 id="entry-title">{copy.title}</h1></div>
      <div className="entry-options">
        <Link className="entry-option guest" to="/booking"><span className="entry-icon" aria-hidden="true">⌁</span><div><strong>{copy.guest}</strong><small>{copy.guestHelp}</small></div><b aria-hidden="true">←</b></Link>
        <Link className="entry-option admin" to="/admin"><span className="entry-icon" aria-hidden="true">◇</span><div><strong>{copy.admin}</strong><small>{copy.adminHelp}</small></div><b aria-hidden="true">←</b></Link>
      </div>
    </section>
  </main>;
}
