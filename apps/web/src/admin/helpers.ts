/*
  helpers.ts (admin)
  Localized copy, formatting helpers, and shared types for the administration area.
*/

import { HIJRI_MONTH_NAMES_AR, HIJRI_MONTH_NAMES_EN } from "@matam/shared";
import { useTranslation } from "react-i18next";
import type { AttendeeGender, Period, Place, Purpose, SpecificPeriod } from "../types";

const TEXT = {
  ar: { admin: "لوحة الإدارة", login: "دخول الإدارة", username: "اسم المستخدم", password: "كلمة المرور", signIn: "تسجيل الدخول", signingIn: "جارٍ الدخول...", invalidLogin: "اسم المستخدم أو كلمة المرور غير صحيحة", connectionError: "تعذر الاتصال بالخادم", dashboard: "الرئيسية", bookings: "طلبات الحجز", blocks: "الفترات المحظورة", overrides: "تصحيح الهجري", settings: "الإعدادات", audit: "سجل العمليات", admins: "المشرفون", publicSite: "الموقع العام", logout: "تسجيل الخروج", createAdmin: "إضافة مشرف", active: "مفعل", inactive: "معطل", activate: "تفعيل", deactivate: "تعطيل", confirmDeactivate: "هل تريد تعطيل حساب هذا المشرف؟", usernameTaken: "اسم المستخدم مستخدم بالفعل", welcome: "مرحباً", pendingRequests: "طلبات بانتظار المراجعة", manageBookings: "إدارة الطلبات", status: "الحالة", period: "الفترة", from: "من", to: "إلى", all: "الكل", filter: "تصفية", reset: "مسح", reference: "رقم الحجز", requester: "مقدم الطلب", phone: "رقم التواصل", date: "التاريخ", created: "تاريخ الطلب", actions: "الإجراءات", view: "عرض", noData: "لا توجد بيانات", pending: "بانتظار المراجعة", approved: "مؤكد", rejected: "مرفوض", cancelled: "ملغي", morning: "فترة الصباح", afternoon: "فترة الظهيرة", evening: "الفترة المسائية", wholeDay: "اليوم بالكامل", back: "رجوع", hijriDate: "التاريخ الهجري", gregorianDate: "التاريخ الميلادي", customerNote: "ملاحظات مقدم الطلب", internalNote: "ملاحظة إدارية داخلية", rejectionReason: "سبب الرفض", approve: "تأكيد الحجز", reject: "رفض الطلب", saveNote: "حفظ الملاحظة", saving: "جارٍ الحفظ...", saved: "تم الحفظ بنجاح", confirmApprove: "هل تريد تأكيد هذا الحجز؟", confirmReject: "هل تريد رفض هذا الطلب؟", addBlock: "إضافة حظر", reason: "السبب", optional: "اختياري", block: "حظر الفترة", unblock: "إلغاء الحظر", confirmDelete: "هل تريد حذف هذا السجل؟", addOverride: "إضافة أو تحديث تصحيح", hijriYear: "السنة الهجرية", hijriMonth: "الشهر الهجري", hijriDay: "اليوم الهجري", save: "حفظ", remove: "حذف", bookingLimit: "حد الحجز المسبق", months: "شهر", bookingLimitHelp: "عدد الأشهر التي يمكن للجمهور الحجز مسبقاً خلالها.", settingKey: "المفتاح", settingValue: "القيمة", updated: "آخر تحديث", action: "العملية", administrator: "المشرف", entity: "السجل", details: "التفاصيل", loadMore: "عرض المزيد", loading: "جارٍ التحميل...", genericError: "حدث خطأ. حاول مرة أخرى.", attendeeGender: "الحضور", attendeeGenderMale: "رجال", attendeeGenderFemale: "نساء", place: "المكان", placeOldMatam: "المأتم القديم", placeMaleHall: "صالة الرجال", placeFemaleHall: "صالة النساء", placeMaleTent: "خيمة الرجال", purpose: "الغرض من الحجز", purposeFatiha: "فاتحة", purposeWedding: "زواج", purposeAqdQiran: "عقد قران", purposeTathwibat: "تثويبات", purposeNuthur: "نذور", purposeMawaqeet: "مواقيت", purposeOther: "أخرى", purposeOtherReason: "سبب آخر", allMaleHalls: "جميع صالات الرجال (المأتم القديم، صالة الرجال، خيمة الرجال)", plusFemaleHall: "بالإضافة إلى صالة النساء" },
  en: { admin: "Administration", login: "Admin sign in", username: "Username", password: "Password", signIn: "Sign in", signingIn: "Signing in...", invalidLogin: "Invalid username or password", connectionError: "Could not connect to the server", dashboard: "Dashboard", bookings: "Bookings", blocks: "Blocked periods", overrides: "Hijri corrections", settings: "Settings", audit: "Audit history", admins: "Administrators", publicSite: "Public site", logout: "Log out", createAdmin: "Add administrator", active: "Active", inactive: "Inactive", activate: "Activate", deactivate: "Deactivate", confirmDeactivate: "Deactivate this administrator's account?", usernameTaken: "That username already exists", welcome: "Welcome", pendingRequests: "Requests awaiting review", manageBookings: "Manage bookings", status: "Status", period: "Period", from: "From", to: "To", all: "All", filter: "Filter", reset: "Reset", reference: "Reference", requester: "Requester", phone: "Contact number", date: "Date", created: "Requested", actions: "Actions", view: "View", noData: "No records found", pending: "Waiting for review", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", morning: "Morning", afternoon: "Afternoon", evening: "Evening", wholeDay: "Whole day", back: "Back", hijriDate: "Hijri date", gregorianDate: "Gregorian date", customerNote: "Requester notes", internalNote: "Internal admin note", rejectionReason: "Rejection reason", approve: "Approve booking", reject: "Reject request", saveNote: "Save note", saving: "Saving...", saved: "Saved successfully", confirmApprove: "Approve this booking?", confirmReject: "Reject this request?", addBlock: "Add blocked period", reason: "Reason", optional: "Optional", block: "Block period", unblock: "Remove block", confirmDelete: "Delete this record?", addOverride: "Add or update correction", hijriYear: "Hijri year", hijriMonth: "Hijri month", hijriDay: "Hijri day", save: "Save", remove: "Remove", bookingLimit: "Advance booking limit", months: "months", bookingLimitHelp: "How many months ahead the public can make a booking.", settingKey: "Key", settingValue: "Value", updated: "Last updated", action: "Action", administrator: "Administrator", entity: "Record", details: "Details", loadMore: "Load more", loading: "Loading...", genericError: "Something went wrong. Please try again.", attendeeGender: "Attending", attendeeGenderMale: "Men", attendeeGenderFemale: "Women", place: "Place", placeOldMatam: "Old Matam", placeMaleHall: "Men's Hall", placeFemaleHall: "Women's Hall", placeMaleTent: "Men's Tent", purpose: "Aim of booking", purposeFatiha: "Fatiha", purposeWedding: "Wedding", purposeAqdQiran: "Marriage contract (Aqd Qiran)", purposeTathwibat: "Tathwibat (condolence gathering)", purposeNuthur: "Vow fulfillment (Nuthur)", purposeMawaqeet: "Mawaqeet (religious observance)", purposeOther: "Other", purposeOtherReason: "Other reason", allMaleHalls: "All men's halls (Old Matam, Men's Hall, Men's Tent)", plusFemaleHall: "Plus the Women's Hall" },
} as const;

export const DASHBOARD_TEXT = {
  ar: { total: "إجمالي الطلبات", approved: "الحجوزات المؤكدة", upcoming: "الحجوزات القادمة", blocked: "الفترات المحظورة القادمة", recent: "أحدث الطلبات", calendarGregorian: "عرض الميلادي", calendarHijri: "عرض الهجري", applyForward: "تطبيق التصحيح على جميع الأيام التالية", applyForwardHelp: "يستمر أثر التصحيح حتى يضيف المشرف تصحيحاً لاحقاً." },
  en: { total: "Total requests", approved: "Approved bookings", upcoming: "Upcoming bookings", blocked: "Upcoming blocked periods", recent: "Recent requests", calendarGregorian: "Gregorian view", calendarHijri: "Hijri view", applyForward: "Apply correction to all following dates", applyForwardHelp: "The adjustment remains active until an administrator adds a newer correction." },
} as const;

// Single source of truth for these names lives in @matam/shared, shared with the API.
export const ADMIN_HIJRI_MONTHS = { ar: HIJRI_MONTH_NAMES_AR, en: HIJRI_MONTH_NAMES_EN };

export type Copy = typeof TEXT.ar;

// ---------------- Helper 1: Read localized administration copy ----------------
export function useAdminText(): Copy {
  const { i18n } = useTranslation();
  return (i18n.language === "en" ? TEXT.en : TEXT.ar) as Copy;
}

const PLACE_KEYS: Record<Place, keyof Copy> = {
  old_matam: "placeOldMatam",
  male_hall: "placeMaleHall",
  female_hall: "placeFemaleHall",
  male_tent: "placeMaleTent",
};

const PURPOSE_KEYS: Record<Purpose, keyof Copy> = {
  fatiha: "purposeFatiha",
  wedding: "purposeWedding",
  aqd_qiran: "purposeAqdQiran",
  tathwibat: "purposeTathwibat",
  nuthur: "purposeNuthur",
  mawaqeet: "purposeMawaqeet",
  other: "purposeOther",
};

const ATTENDEE_GENDER_KEYS: Record<AttendeeGender, keyof Copy> = {
  male: "attendeeGenderMale",
  female: "attendeeGenderFemale",
};

// ---------------- Helper 2: Label a booking period ----------------
// "all" reads as "whole day" here — c.all is already taken by the generic filter option label.
export function periodLabel(period: Period, c: Copy): string {
  return period === "all" ? c.wholeDay : c[period];
}

// ---------------- Helper 2b: Label a booking's period list ----------------
// All three specific periods together read as "whole day" rather than being spelled out.
export function periodsLabel(periods: SpecificPeriod[], c: Copy): string {
  if (periods.length === 3) return c.wholeDay;
  return periods.map((period) => c[period]).join(", ");
}

// ---------------- Helper 3: Label a booking place ----------------
export function placeLabel(place: Place, c: Copy): string {
  return c[PLACE_KEYS[place]];
}

// ---------------- Helper 4: Label a booking purpose ----------------
export function purposeLabel(purpose: Purpose, c: Copy): string {
  return c[PURPOSE_KEYS[purpose]];
}

// ---------------- Helper 5: Label an attendee gender ----------------
export function attendeeGenderLabel(gender: AttendeeGender, c: Copy): string {
  return c[ATTENDEE_GENDER_KEYS[gender]];
}

// ---------------- Helper 6: Format an administrative timestamp ----------------
export function formatDateTime(value: string | null, language: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "ar-BH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// ---------------- Helper 7: Build a practical default date range ----------------
export function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const later = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  return { from: now.toISOString().slice(0, 10), to: later.toISOString().slice(0, 10) };
}

// ---------------- Helper 8: Get Saturday-first weekday labels ----------------
export function adminWeekdays(language: string): string[] {
  const formatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "ar-BH", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, 6 + index))));
}
