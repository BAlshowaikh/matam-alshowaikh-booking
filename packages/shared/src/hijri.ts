/*
  hijri.ts
  Wraps the @tabby_ai/hijri-converter library so the rest of the app never
  imports it directly — if the library ever needs swapping, only this file
  changes. Shared by apps/api (calculation) and apps/web (display).
*/

import hijriConverterPkg from "@tabby_ai/hijri-converter";

const { gregorianToHijri: toHijri, hijriToGregorian: toGregorian } = hijriConverterPkg;

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

// ---------------- Function 1: Gregorian -> Hijri ----------------
// Umm al-Qura calculated conversion; may differ ±1 day from local moon-sighting announcements.
export function gregorianToHijri(date: GregorianDate): HijriDate {
  return toHijri(date);
}

// ---------------- Function 2: Hijri -> Gregorian ----------------
// Used when an admin enters/corrects a Hijri date and we need the matching Gregorian value.
export function hijriToGregorian(date: HijriDate): GregorianDate {
  return toGregorian(date);
}

// ---------------- Data 1: Hijri month names ----------------
// Index 0 = Muharram ... index 11 = Dhu al-Hijjah, matching the 1-12 month numbers above.
export const HIJRI_MONTH_NAMES_AR = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

export const HIJRI_MONTH_NAMES_EN = [
  "Muharram",
  "Safar",
  "Rabi' al-awwal",
  "Rabi' al-thani",
  "Jumada al-awwal",
  "Jumada al-thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
] as const;
