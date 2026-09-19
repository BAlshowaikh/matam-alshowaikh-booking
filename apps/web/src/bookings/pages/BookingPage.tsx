/*
  BookingPage.tsx
  Renders the public booking journey with a responsive calendar, guided venue choices,
  requester details, and a final review before submission.
*/

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { normalizePhone, PLACES_BY_GENDER, PLACE_ALLOWED_PERIODS, SPECIFIC_PERIODS } from "@matam/shared";
import { ApiError, createBooking, getCalendarWindow } from "../../api";
import { useToast } from "../../components/FeedbackProvider";
import type { AttendeeGender, CalendarDay, HijriDate, Period, Place, PeriodStatus, Purpose, SpecificPeriod } from "../../types";
import Summary from "../components/Summary";
import {
  HIJRI_MONTHS,
  addDays,
  formatGregorian,
  formatGregorianMonth,
  formatGregorianRange,
  formatHijri,
  formatHijriMonth,
  formatHijriRange,
  formatPeriods,
  getTodayKey,
  shiftHijriMonth,
  weekdays,
} from "../helpers";

const PURPOSE_OPTIONS: Purpose[] = ["fatiha", "wedding", "aqd_qiran", "tathwibat", "nuthur", "mawaqeet", "other"];
const CALENDAR_PLACEHOLDERS = Array.from({ length: 35 }, (_, index) => index);

// ---------------- Helper 1: Resolve a period's availability ----------------
function statusFor(day: CalendarDay, period: Period): PeriodStatus {
  if (period !== "all") return day.periods[period];

  // A whole-day request is free only when all three individual periods are free.
  const statuses = SPECIFIC_PERIODS.map((specific) => day.periods[specific]);
  if (statuses.every((status) => status === "free")) return "free";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "approved")) return "approved";
  return "pending";
}

// ---------------- Function 1: Public booking journey ----------------
export default function BookingPage() {
  /*
    Booking flow
    - Load and navigate an override-aware dual-calendar month.
    - Collect dependent day, attendance, venue, period, and purpose choices.
    - Validate requester details, review the full request, and submit it once.
  */
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const notify = useToast();
  const [anchor, setAnchor] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState<"hijri" | "gregorian">(() => localStorage.getItem("matam-calendar-mode") === "gregorian" ? "gregorian" : "hijri");
  const [allDays, setAllDays] = useState<CalendarDay[]>([]);
  const [hijriMonth, setHijriMonth] = useState<Pick<HijriDate, "year" | "month"> | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [attendeeGender, setAttendeeGender] = useState<AttendeeGender | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [includeFemaleHall, setIncludeFemaleHall] = useState(false);
  const [periods, setPeriods] = useState<SpecificPeriod[]>([]);
  const [step, setStep] = useState<"calendar" | "details" | "review">("calendar");
  const [form, setForm] = useState({ name: "", phone: "", purpose: "" as Purpose | "", purposeOther: "", website: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const selectionPanelRef = useRef<HTMLElement>(null);
  const todayKey = useMemo(getTodayKey, []);
  const locale = i18n.language === "ar" ? "ar" : "en";

  /*
    Calendar loading
    - Fetch a wide Gregorian window because a Hijri month crosses Gregorian boundaries.
    - Adopt the API's authoritative Hijri month on the first successful response.
  */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCalendarError(false);
    getCalendarWindow(anchor)
      .then((result) => {
        if (!active) return;
        setAllDays(result);

        // The API date mapping accounts for any administrator-configured Hijri overrides.
        if (!hijriMonth) {
          const today = result.find((day) => day.date === todayKey) ?? result[Math.floor(result.length / 2)];
          setHijriMonth({ year: today.hijri.year, month: today.hijri.month });
        }
      })
      .catch(() => active && setCalendarError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [anchor, hijriMonth, retryCount, todayKey]);

  // Keep both calendar representations available while filtering the visible month.
  const days = useMemo(() => {
    if (calendarMode === "hijri") {
      return hijriMonth ? allDays.filter((day) => day.hijri.year === hijriMonth.year && day.hijri.month === hijriMonth.month) : [];
    }
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    return allDays.filter((day) => Number(day.date.slice(0, 4)) === year && Number(day.date.slice(5, 7)) === month);
  }, [allDays, anchor, calendarMode, hijriMonth]);
  const firstOffset = days.length ? (new Date(`${days[0].date}T12:00:00`).getDay() + 1) % 7 : 0;
  const availablePeriods = place ? (PLACE_ALLOWED_PERIODS[place].filter((item) => item !== "all") as SpecificPeriod[]) : [];
  // A Fatiha booked by a male attendee always reserves every men's hall at once, so the
  // place step becomes a fixed notice instead of the usual single-hall picker.
  const reserveAllMaleHalls = form.purpose === "fatiha" && attendeeGender === "male";
  const completedSelection = Boolean(selectedDay && attendeeGender && form.purpose && (form.purpose !== "other" || form.purposeOther.trim()) && place && periods.length > 0);
  const nameIsValid = form.name.trim().length >= 2;
  const nameError = nameTouched && !nameIsValid ? (form.name.trim() ? t("invalidName") : t("required")) : "";
  const phoneIsValid = normalizePhone(form.phone) !== null;
  const phoneError = phoneTouched && !phoneIsValid ? (form.phone.trim() ? t("invalidPhone") : t("required")) : "";

  // ---------------- Method 1: Reset dependent booking choices ----------------
  const resetSelection = () => {
    // Changing a date or calendar invalidates every choice that depends on availability.
    setSelectedDay(null);
    setAttendeeGender(null);
    setPlace(null);
    setIncludeFemaleHall(false);
    setPeriods([]);
  };

  // ---------------- Method 1b: Toggle one period in the multi-select ----------------
  const togglePeriod = (item: SpecificPeriod) => {
    setPeriods((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  };

  // ---------------- Method 2: Select a calendar day ----------------
  const selectDay = (day: CalendarDay) => {
    // Reset dependent choices before revealing the guide for the new date.
    resetSelection();
    setSelectedDay(day);

    // Bring the below-calendar choice panel into view on narrow screens only.
    if (window.matchMedia("(max-width: 60.99rem)").matches) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => selectionPanelRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })));
    }
  };

  // ---------------- Method 3: Navigate calendar months ----------------
  const changeMonth = (amount: -1 | 1) => {
    // Prevent navigation until the current month has supplied a reliable boundary date.
    if (!days.length) return;

    // Gregorian mode follows exact Gregorian month boundaries.
    if (calendarMode === "gregorian") {
      setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
      setMonthOffset((value) => value + amount);
      resetSelection();
      return;
    }

    // Hijri mode advances from the authoritative edge dates returned by the API.
    if (!hijriMonth) return;
    const edgeDate = amount === 1 ? days.at(-1)!.date : days[0].date;
    setHijriMonth(shiftHijriMonth(hijriMonth, amount));
    setMonthOffset((value) => value + amount);
    setAnchor(addDays(edgeDate, amount));
    resetSelection();
  };

  // ---------------- Method 4: Change calendar system ----------------
  const changeCalendarMode = (mode: "hijri" | "gregorian") => {
    // Persist the preference and return to the current month for a predictable switch.
    setCalendarMode(mode);
    localStorage.setItem("matam-calendar-mode", mode);
    setAnchor(new Date());
    setMonthOffset(0);
    resetSelection();
  };

  // ---------------- Method 5: Update and validate the requester name ----------------
  const updateName = (event: ChangeEvent<HTMLInputElement>) => {
    // Validate from the first edit and reject empty or one-character names consistently with the API.
    setNameTouched(true);
    setForm({ ...form, name: event.target.value });
    setError("");
  };

  // ---------------- Method 6: Update and validate the contact number ----------------
  const updatePhone = (event: ChangeEvent<HTMLInputElement>) => {
    // Validate from the first edit and clear unrelated submission feedback when the value changes.
    setPhoneTouched(true);
    setForm({ ...form, phone: event.target.value });
    setError("");
  };

  // ---------------- Method 7: Continue from requester details ----------------
  const continueDetails = (event: FormEvent) => {
    // Block incomplete or invalid identity information before opening the final review.
    event.preventDefault();
    if (!nameIsValid) {
      setNameTouched(true);
      setError("");
      return;
    }
    if (!phoneIsValid) {
      setPhoneTouched(true);
      setError("");
      return;
    }
    setError("");
    setStep("review");
  };

  // ---------------- Method 8: Submit the reviewed request ----------------
  const submit = async () => {
    // Guard the API from any incomplete state reached through unexpected navigation.
    if (!selectedDay || !periods.length || !attendeeGender || !place || !form.purpose || !nameIsValid || !phoneIsValid) return;
    setSubmitting(true);
    setError("");

    try {
      const result = await createBooking({
        date: selectedDay.date,
        periods,
        name: form.name,
        phone: form.phone,
        purpose: form.purpose,
        purposeOther: form.purpose === "other" ? form.purposeOther : undefined,
        attendeeGender,
        place,
        includeFemaleHall: reserveAllMaleHalls ? includeFemaleHall : undefined,
        website: form.website,
      });
      sessionStorage.setItem("matam-last-booking", JSON.stringify(result));
      notify(t("success"));
      navigate("/confirmation", { state: result });
    } catch (requestError) {
      const message = requestError instanceof ApiError && requestError.code === "INVALID_PHONE" ? t("invalidPhone") : t("genericError");
      setError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Render one stage at a time while keeping progress and prior selections visible.
  return <>
    <section className="hero booking-hero">
      <span className="eyebrow">{t("booking")}</span>
      <h1>{t("intro")}</h1>
      <div className="ornament" aria-hidden="true"><i /><span>◆</span><i /></div>
    </section>

    <section className="booking-card booking-flow">
      <nav className="steps" aria-label={t("bookingProgress")}>
        {(["selectDay", "details", "review"] as const).map((label, index) => {
          const activeIndex = step === "calendar" ? 0 : step === "details" ? 1 : 2;
          const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "";
          return <div className={`step-item ${state}`} key={label} aria-current={index === activeIndex ? "step" : undefined}>
            <span>{index < activeIndex ? "✓" : new Intl.NumberFormat(locale).format(index + 1)}</span>
            <small>{t(label)}</small>
          </div>;
        })}
      </nav>

      {step === "calendar" && <div className="calendar-step booking-workspace">
        <div className="calendar-column">
          <div className="section-heading calendar-heading">
            <div><span className="eyebrow">01</span><h2>{t("selectDay")}</h2></div>
            <div className="month-controls">
              <button disabled={monthOffset <= 0 || loading} aria-label={t("previous")} onClick={() => changeMonth(-1)}>‹</button>
              <div className="month-title">
                <strong>{calendarMode === "hijri" ? (hijriMonth ? formatHijriMonth(hijriMonth, i18n.language) : "—") : formatGregorianMonth(anchor, i18n.language)}</strong>
                <small>{calendarMode === "hijri" ? formatGregorianRange(days, i18n.language) : formatHijriRange(days, i18n.language)}</small>
              </div>
              <button disabled={monthOffset >= 12 || loading} aria-label={t("next")} onClick={() => changeMonth(1)}>›</button>
            </div>
          </div>

          <div className="calendar-toolbar">
            <div className="calendar-mode-switch public-calendar-switch" aria-label={t("calendarDisplay")}>
              <button type="button" className={calendarMode === "hijri" ? "active" : ""} aria-pressed={calendarMode === "hijri"} onClick={() => changeCalendarMode("hijri")}>{t("showHijri")}</button>
              <button type="button" className={calendarMode === "gregorian" ? "active" : ""} aria-pressed={calendarMode === "gregorian"} onClick={() => changeCalendarMode("gregorian")}>{t("showGregorian")}</button>
            </div>
            <div className="legend">{(["free", "pending", "approved", "blocked"] as PeriodStatus[]).map((status) => <span key={status}><i className={`dot ${status === "blocked" ? "blocked-cross" : status}`} />{t(`availabilityStatus.${status}`)}</span>)}</div>
          </div>

          {calendarError
            ? <div className="calendar-error" role="alert"><strong>{t("calendarUnavailable")}</strong><p>{t("calendarUnavailableHelp")}</p><button className="secondary-button" onClick={() => setRetryCount((value) => value + 1)}>{t("retry")}</button></div>
            : <div className={`calendar-grid ${loading ? "loading" : ""}`} aria-busy={loading}>
                {weekdays(i18n.language).map((day) => <b className="weekday" key={day}>{day}</b>)}
                {loading && !days.length
                  ? CALENDAR_PLACEHOLDERS.map((item) => <span className="day day-placeholder" key={item} />)
                  : <>
                      {Array.from({ length: firstOffset }, (_, index) => <span className="empty-day" key={`empty-${index}`} />)}
                      {days.map((day) => {
                        const isPast = day.date < todayKey;
                        const isFullyBlocked = SPECIFIC_PERIODS.every((specific) => day.periods[specific] === "blocked");
                        const primaryDay = calendarMode === "hijri" ? day.hijri.day : Number(day.date.slice(-2));
                        const secondaryDate = calendarMode === "hijri"
                          ? new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-BH" : "en-GB", { day: "numeric", month: "short" }).format(new Date(`${day.date}T12:00:00`))
                          : `${new Intl.NumberFormat(locale).format(day.hijri.day)} ${HIJRI_MONTHS[locale][day.hijri.month - 1]}`;
                        const availabilityLabel = SPECIFIC_PERIODS.map((specific) => `${t(specific)}: ${t(day.periods[specific])}`).join(", ");
                        return <button key={day.date} disabled={isPast} aria-disabled={isFullyBlocked} className={`day ${isFullyBlocked ? "fully-blocked" : ""} ${day.date === todayKey ? "today" : ""} ${selectedDay?.date === day.date ? "selected" : ""}`} aria-label={`${day.date === todayKey ? `${t("today")}, ` : ""}${formatHijri(day.hijri, i18n.language)}, ${formatGregorian(day.date, i18n.language)}. ${availabilityLabel}`} aria-pressed={selectedDay?.date === day.date} onClick={() => { if (!isFullyBlocked) selectDay(day); }}>
                          <strong className="hijri-day">{new Intl.NumberFormat(locale).format(primaryDay)}</strong>
                          <small className="gregorian-day">{secondaryDate}</small>
                          <span className="day-periods"><i className={`period-mark ${day.periods.morning}`} title={`${t("morning")}: ${t(day.periods.morning)}`} /><i className={`period-mark ${day.periods.afternoon}`} title={`${t("afternoon")}: ${t(day.periods.afternoon)}`} /><i className={`period-mark ${day.periods.evening}`} title={`${t("evening")}: ${t(day.periods.evening)}`} /></span>
                        </button>;
                      })}
                    </>}
              </div>}
        </div>

        <aside ref={selectionPanelRef} className={`selection-panel ${selectedDay ? "has-selection" : ""}`} aria-live="polite">
          {!selectedDay
            ? <div className="selection-empty"><span aria-hidden="true">⌁</span><strong>{t("selectDay")}</strong><small>{t("intro")}</small></div>
            : <>
                <div className="selected-date"><span aria-hidden="true">✓</span><div><strong>{formatHijri(selectedDay.hijri, i18n.language)}</strong><small>{formatGregorian(selectedDay.date, i18n.language)}</small></div></div>

                <div className="choice-group">
                  <h3><span>1</span>{t("attending")}</h3>
                  <div className="attending-options">{(["male", "female"] as AttendeeGender[]).map((gender) => <button type="button" className={attendeeGender === gender ? "selected" : ""} aria-pressed={attendeeGender === gender} onClick={() => { setAttendeeGender(gender); setPlace(gender === "male" && form.purpose === "fatiha" ? "male_hall" : null); setIncludeFemaleHall(false); setPeriods([]); }} key={gender}>{t(`attendingOption.${gender}`)}<i>✓</i></button>)}</div>
                </div>

                {attendeeGender && <div className="choice-group">
                  <h3><span>2</span>{t("purpose")}</h3>
                  <label className="purpose-select"><select aria-label={t("purpose")} value={form.purpose} onChange={(event) => { const nextPurpose = event.target.value as Purpose; setForm({ ...form, purpose: nextPurpose }); setPlace(nextPurpose === "fatiha" && attendeeGender === "male" ? "male_hall" : null); setIncludeFemaleHall(false); setPeriods([]); }}><option value="" disabled>{t("purpose")}</option>{PURPOSE_OPTIONS.map((option) => <option value={option} key={option}>{t(`purposeOption.${option}`)}</option>)}</select></label>
                  {form.purpose === "other" && <label className="other-purpose">{t("purposeOtherPlaceholder")}<input value={form.purposeOther} onChange={(event) => setForm({ ...form, purposeOther: event.target.value })} /></label>}
                </div>}

                {attendeeGender && form.purpose && <div className="choice-group">
                  <h3><span>3</span>{t("place")}</h3>
                  {reserveAllMaleHalls
                    ? <>
                        <p className="all-male-halls-notice">{t("allMaleHallsNotice")}</p>
                        <div className="place-options">{(["old_matam", "male_hall", "male_tent"] as Place[]).map((option) => <label className="checkbox-option selected" key={option}><input type="checkbox" checked readOnly disabled />{t(`placeOption.${option}`)}</label>)}</div>
                        <label className="checkbox-option also-female-hall"><input type="checkbox" checked={includeFemaleHall} onChange={(event) => setIncludeFemaleHall(event.target.checked)} />{t("alsoBookFemaleHallLabel")}</label>
                      </>
                    : <div className="place-options">{PLACES_BY_GENDER[attendeeGender].map((option) => <button type="button" className={place === option ? "selected" : ""} aria-pressed={place === option} onClick={() => { setPlace(option); setPeriods([]); }} key={option}>{t(`placeOption.${option}`)}<i>✓</i></button>)}</div>}
                </div>}

                {place && <div className="choice-group">
                  <h3><span>4</span>{t("selectPeriod")}</h3>
                  <div className="period-options">
                    {(() => {
                      const wholeDayStatus = statusFor(selectedDay, "all");
                      return <button type="button" disabled={wholeDayStatus !== "free"} className={periods.length === 3 ? "selected" : ""} aria-pressed={periods.length === 3} onClick={() => setPeriods(periods.length === 3 ? [] : [...SPECIFIC_PERIODS])}><span>{t("all")}</span><small><i className={`dot ${wholeDayStatus}`} />{t(wholeDayStatus)}</small></button>;
                    })()}
                    {availablePeriods.map((item) => {
                      const status = statusFor(selectedDay, item);
                      return <button type="button" disabled={status !== "free"} className={periods.includes(item) ? "selected" : ""} aria-pressed={periods.includes(item)} onClick={() => togglePeriod(item)} key={item}><span>{t(item)}</span><small><i className={`dot ${status}`} />{t(status)}</small></button>;
                    })}
                  </div>
                </div>}

                <button className="primary-button selection-continue" disabled={!completedSelection} onClick={() => { setError(""); setStep("details"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("continue")}<span aria-hidden="true">←</span></button>
              </>}
        </aside>
      </div>}

      {step === "details" && selectedDay && periods.length > 0 && attendeeGender && place && form.purpose && <form className="form-step" onSubmit={continueDetails}>
        <div className="section-heading"><div><span className="eyebrow">02</span><h2>{t("details")}</h2></div></div>
        <div className="booking-context"><span aria-hidden="true">✓</span><div><strong>{formatHijri(selectedDay.hijri, i18n.language)} · {formatPeriods(periods, t)}</strong><small>{t(`placeOption.${place}`)} · {t(`purposeOption.${form.purpose}`)}</small></div></div>
        <label className={`field-label ${nameError ? "invalid" : nameTouched ? "valid" : ""}`}>{t("fullName")}<input value={form.name} onChange={updateName} onBlur={() => setNameTouched(true)} autoComplete="name" maxLength={200} aria-invalid={Boolean(nameError)} aria-describedby="name-error" autoFocus required /><span className="field-message" id="name-error" role="status" aria-live="polite">{nameError}</span></label>
        <label className={`field-label ${phoneError ? "invalid" : phoneTouched ? "valid" : ""}`}>{t("phone")}<input className="ltr-input" inputMode="tel" value={form.phone} onChange={updatePhone} onBlur={() => setPhoneTouched(true)} autoComplete="tel" maxLength={24} aria-invalid={Boolean(phoneError)} aria-describedby="phone-hint phone-error" required /><small id="phone-hint">{t("phoneHint")}</small><span className="field-message" id="phone-error" role="status" aria-live="polite">{phoneError}</span></label>
        <input className="honeypot" tabIndex={-1} aria-hidden="true" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
        <p className="error" role="alert">{error}</p>
        <div className="actions"><button type="button" className="secondary-button" onClick={() => { setError(""); setStep("calendar"); }}>{t("back")}</button><button className="primary-button">{t("continue")}</button></div>
      </form>}

      {step === "review" && selectedDay && periods.length > 0 && attendeeGender && place && form.purpose && <div className="review-step">
        <div className="section-heading"><div><span className="eyebrow">03</span><h2>{t("review")}</h2></div></div>
        <p className="review-intro">{t("confirmText")}</p>
        <Summary result={{ date: selectedDay.date, hijri: selectedDay.hijri, periods, purpose: form.purpose, purposeOther: form.purposeOther || undefined, attendeeGender, place, includeFemaleHall: reserveAllMaleHalls ? includeFemaleHall : undefined, status: "pending", reference: "" }} />
        <div className="requester-summary"><span>{t("fullName")}</span><strong>{form.name}</strong><span>{t("phone")}</span><strong dir="ltr">{form.phone}</strong></div>
        <p className="error" role="alert">{error}</p>
        <div className="actions"><button className="secondary-button" onClick={() => { setError(""); setStep("details"); }}>{t("back")}</button><button className="primary-button" disabled={submitting} onClick={submit}>{submitting ? t("submitting") : t("submit")}</button></div>
      </div>}
    </section>
  </>;
}
