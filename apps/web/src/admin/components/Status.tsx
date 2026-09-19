/*
  Status.tsx
  Renders a localized booking status pill.
*/

import type { BookingStatus } from "../../types";
import { useAdminText } from "../helpers";

export default function Status({ status }: { status: BookingStatus }) {
  const c = useAdminText();
  return <span className={`admin-status ${status}`}>{c[status]}</span>;
}
