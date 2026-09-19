/*
  App.tsx
  Top-level route dispatcher: chooses the admin shell, the entry landing page,
  or the branded public site shell around the booking journey.
*/

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router-dom";
import AdminApp from "./admin/AdminApp";
import Header from "./bookings/components/Header";
import Footer from "./bookings/components/Footer";
import LandingPage from "./bookings/pages/LandingPage";
import BookingPage from "./bookings/pages/BookingPage";
import ConfirmationPage from "./bookings/pages/ConfirmationPage";
import LookupPage from "./bookings/pages/LookupPage";

// ---------------- Function 1: Application route shell ----------------
export default function App() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Reset viewport and focus after client-side navigation so every page begins predictably.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  // Keep browser history and assistive windows identifiable after route or language changes.
  useEffect(() => {
    const pageName = location.pathname.startsWith("/admin")
      ? t("administration")
      : location.pathname === "/lookup"
        ? t("lookupTitle")
        : location.pathname === "/confirmation"
          ? t("success")
          : location.pathname === "/"
            ? t("brand")
            : t("booking");
    document.title = `${pageName} · ${t("brand")}`;
  }, [i18n.language, location.pathname, t]);

  // The administration area owns its dashboard shell; public routes share the branded site shell.
  let content;
  if (location.pathname.startsWith("/admin")) content = <AdminApp />;
  else if (location.pathname === "/") content = <LandingPage />;
  else content = <div className="app-shell">
    <Header />
    <main id="main-content" tabIndex={-1}>
      <Routes>
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/lookup" element={<LookupPage />} />
        <Route path="*" element={<BookingPage />} />
      </Routes>
    </main>
    <Footer />
  </div>;

  return <><a className="skip-link" href="#main-content">{t("skipToContent")}</a>{content}</>;
}
