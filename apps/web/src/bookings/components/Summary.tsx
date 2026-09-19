/*
  Summary.tsx
  Renders booking date and status details, shared by review, confirmation, and lookup.
*/

import { useTranslation } from "react-i18next";
import type { BookingResult } from "../../types";
import { formatGregorian, formatHijri, formatPeriods } from "../helpers";

// ---------------- Function 1: Booking summary ----------------
export default function Summary({ result, lookupStatus = false }: { result: BookingResult; lookupStatus?: boolean }) {
  const { t, i18n } = useTranslation();
  const statusLabel = lookupStatus ? t(`lookupStatus.${result.status}`) : t(result.status);

  // Render optional private details only when the response actually contains them.
  return <dl className="summary">
    <div><dt>{t("hijri")}</dt><dd>{formatHijri(result.hijri, i18n.language)}</dd></div>
    <div><dt>{t("gregorian")}</dt><dd>{formatGregorian(result.date, i18n.language)}</dd></div>
    {result.attendeeGender && <div><dt>{t("attending")}</dt><dd>{t(`attendingOption.${result.attendeeGender}`)}</dd></div>}
    {result.place && <div><dt>{t("place")}</dt><dd>{result.purpose === "fatiha" && result.attendeeGender === "male" ? t("allMaleHallsNotice") : t(`placeOption.${result.place}`)}</dd></div>}
    {result.includeFemaleHall && <div><dt>{t("place")}</dt><dd>{t("plusFemaleHall")}</dd></div>}
    <div><dt>{t("selectPeriod")}</dt><dd>{formatPeriods(result.periods, t)}</dd></div>
    {result.purpose && <div><dt>{t("purpose")}</dt><dd>{result.purpose === "other" && result.purposeOther ? result.purposeOther : t(`purposeOption.${result.purpose}`)}</dd></div>}
    <div><dt>{t("lookup")}</dt><dd><span className={`status-pill ${result.status}`}>{statusLabel}</span></dd></div>
  </dl>;
}
