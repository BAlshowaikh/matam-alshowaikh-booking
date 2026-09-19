/*
  AdminLoading.tsx
  Renders an administration loading state.
*/

import { useAdminText } from "../helpers";

// ---------------- Function 1: Administration loading state ----------------
export default function AdminLoading() {
  const c = useAdminText();

  // Announce indeterminate loading without exposing the decorative spinner.
  return <div className="admin-loading" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" />{c.loading}</div>;
}
