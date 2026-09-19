/*
  LookupPage.tsx
  Renders the privacy-safe booking lookup by reference.
*/

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ApiError, lookupBooking } from "../../api";
import type { BookingResult } from "../../types";
import Summary from "../components/Summary";

// ---------------- Function 1: Booking status lookup page ----------------
export default function LookupPage() {
  const { t } = useTranslation();
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------------- Method 1: Search by booking reference ----------------
  const search = async (event: FormEvent) => {
    // Use the unique booking reference as the only lookup credential for a simpler visitor flow.
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try { setResult(await lookupBooking(reference)); }
    catch (requestError) { setError(requestError instanceof ApiError && requestError.code === "BOOKING_NOT_FOUND" ? t("noResult") : t("genericError")); }
    finally { setLoading(false); }
  };

  // Protect against duplicate requests and announce the changing result region.
  return <section className="narrow-card lookup-card"><span className="eyebrow">{t("lookup")}</span><h1>{t("lookupTitle")}</h1><p>{t("lookupInstructions")}</p><form className="lookup-form" onSubmit={search} aria-busy={loading}><label>{t("reference")}<input dir="ltr" value={reference} onChange={(event) => setReference(event.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="MTM-XXXXXX" autoComplete="off" spellCheck={false} maxLength={24} autoFocus required /></label><button className="primary-button" disabled={loading}>{loading ? <><span className="button-spinner" aria-hidden="true" />{t("searching")}</> : t("search")}</button></form><div className="lookup-result" aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{result && <Summary result={result} lookupStatus />}</div><Link className="secondary-button lookup-back" to="/booking">{t("backToCalendar")}</Link></section>;
}
