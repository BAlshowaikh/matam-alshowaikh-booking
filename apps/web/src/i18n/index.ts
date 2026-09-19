/*
  index.ts (i18n)
  Initializes Arabic-first localization, English switching, and persisted layout direction.
*/

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar.json";
import en from "./en.json";

// Calendar availability uses "Booked", while lookup keeps the distinct customer-facing "Confirmed" status.
const resources = {
  ar: { translation: ar },
  en: { translation: en },
};

const savedLanguage = localStorage.getItem("matam-language");

// Arabic remains the deterministic default when this device has no saved preference.
void i18n.use(initReactI18next).init({ resources, lng: savedLanguage === "en" ? "en" : "ar", fallbackLng: "ar", interpolation: { escapeValue: false } });

// ---------------- Function 1: Apply document language ----------------
export function applyDocumentLanguage(language: string): void {
  const normalized = language === "en" ? "en" : "ar";
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === "ar" ? "rtl" : "ltr";
  localStorage.setItem("matam-language", normalized);
}

applyDocumentLanguage(i18n.language);
export default i18n;
