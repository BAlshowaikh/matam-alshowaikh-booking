/*
  Footer.tsx
  Renders the restrained public site footer.
*/

import { useTranslation } from "react-i18next";
import logo from "../../assets/matam-logo-transparent.png";

// ---------------- Function 1: Public site footer ----------------
export default function Footer() {
  const { t } = useTranslation();

  // Pair the legal line with the decorative brand mark without duplicate alt text.
  return <footer><img src={logo} alt="" /><span>© {new Date().getFullYear()} {t("brand")}</span></footer>;
}
