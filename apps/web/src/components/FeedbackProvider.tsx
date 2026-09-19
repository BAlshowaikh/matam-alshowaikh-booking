/*
  FeedbackProvider.tsx
  Provides app-native confirmations and toast notifications, shared by any module.
*/

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const FEEDBACK_TEXT = {
  ar: { confirmTitle: "تأكيد الإجراء", confirm: "تأكيد", cancel: "إلغاء", close: "إغلاق التنبيه", success: "تم تنفيذ العملية بنجاح" },
  en: { confirmTitle: "Confirm action", confirm: "Confirm", cancel: "Cancel", close: "Dismiss notification", success: "Action completed successfully" },
} as const;

type ToastKind = "success" | "error";
type ToastContextValue = (message: string, kind?: ToastKind) => void;
type ConfirmContextValue = (message: string) => Promise<boolean>;

// Shared feedback channels keep all confirmations and notifications inside the application UI.
const ToastContext = createContext<ToastContextValue>(() => undefined);
const ConfirmContext = createContext<ConfirmContextValue>(async () => false);

// ---------------- Function 1: Shared feedback provider ----------------
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const labels = i18n.language === "en" ? FEEDBACK_TEXT.en : FEEDBACK_TEXT.ar;
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmationResolver = useRef<((accepted: boolean) => void) | null>(null);
  const confirmationTrigger = useRef<HTMLElement | null>(null);

  // ---------------- Method 1: Show a temporary notification ----------------
  const notify = useCallback<ToastContextValue>((message, kind = "success") => {
    // Replace the current toast and dismiss it automatically after a readable interval.
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: message || labels.success, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, [labels.success]);

  // ---------------- Method 2: Open a confirmation request ----------------
  const requestConfirmation = useCallback<ConfirmContextValue>((message) => new Promise((resolve) => {
    // Resolve any superseded request safely and remember where keyboard focus originated.
    confirmationResolver.current?.(false);
    confirmationResolver.current = resolve;
    confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmation(message);
  }), []);

  // ---------------- Method 3: Settle the active confirmation ----------------
  const settleConfirmation = useCallback((accepted: boolean) => {
    // Close the modal before returning the visitor's decision to the pending action.
    const resolve = confirmationResolver.current;
    confirmationResolver.current = null;
    setConfirmation(null);
    resolve?.(accepted);
  }, []);

  // Dismiss on Escape, prevent background scrolling, and restore the triggering control's focus.
  useEffect(() => {
    if (!confirmation) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") settleConfirmation(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      confirmationTrigger.current?.focus();
      confirmationTrigger.current = null;
    };
  }, [confirmation, settleConfirmation]);

  // Clear pending timers and promises if the administration shell unmounts.
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    confirmationResolver.current?.(false);
  }, []);

  // Render notifications after page content so they remain visually and semantically prominent.
  return <ToastContext.Provider value={notify}><ConfirmContext.Provider value={requestConfirmation}>{children}{toast && <div className={`app-toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"} aria-live={toast.kind === "error" ? "assertive" : "polite"} aria-atomic="true"><i aria-hidden="true">{toast.kind === "success" ? "✓" : "!"}</i><span>{toast.message}</span><button type="button" aria-label={labels.close} onClick={() => setToast(null)}>×</button></div>}{confirmation && <div className="app-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) settleConfirmation(false); }}><section className="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message"><span className="dialog-mark" aria-hidden="true">?</span><h2 id="confirmation-title">{labels.confirmTitle}</h2><p id="confirmation-message">{confirmation}</p><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => settleConfirmation(false)}>{labels.cancel}</button><button type="button" className="primary-button" autoFocus onClick={() => settleConfirmation(true)}>{labels.confirm}</button></div></section></div>}</ConfirmContext.Provider></ToastContext.Provider>;
}

// ---------------- Helper 1: Access the shared toast dispatcher ----------------
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ---------------- Helper 2: Access the app-native confirmation dialog ----------------
export function useConfirm(): ConfirmContextValue {
  return useContext(ConfirmContext);
}
