/*
  ConfirmationPage.tsx
  Renders the successful booking confirmation.
*/

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import type { BookingResult } from "../../types";
import Summary from "../components/Summary";
import { getStoredBooking } from "../helpers";

// ---------------- Function 1: Booking confirmation page ----------------
export default function ConfirmationPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const result = (location.state ?? getStoredBooking()) as BookingResult | null;
  const [copied, setCopied] = useState(false);

  // ---------------- Method 1: Copy the booking reference ----------------
  const copyReference = async () => {
    if (!result) return;

    // The Clipboard API keeps the reference exact and avoids manual transcription errors.
    try {
      await navigator.clipboard.writeText(result.reference);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // Give direct recovery when a confirmation is opened without stored booking state.
  if (!result) return <section className="narrow-card empty-state"><span aria-hidden="true">!</span><p>{t("genericError")}</p><Link className="primary-button" to="/booking">{t("newBooking")}</Link></section>;

  // Place the reference before secondary details and make it immediately reusable.
  return <section className="narrow-card confirmation"><div className="success-mark" aria-hidden="true">✓</div><span className="eyebrow">{t("success")}</span><h1>{t("success")}</h1><p>{t("saveReference")}</p><div className="reference"><small>{t("reference")}</small><strong dir="ltr">{result.reference}</strong><button type="button" className={copied ? "copied" : ""} onClick={copyReference}>{copied ? t("copied") : t("copyReference")}</button></div><Summary result={result} /><div className="actions"><Link className="secondary-button" to="/lookup">{t("lookup")}</Link><Link className="primary-button" to="/booking">{t("newBooking")}</Link></div></section>;
}
