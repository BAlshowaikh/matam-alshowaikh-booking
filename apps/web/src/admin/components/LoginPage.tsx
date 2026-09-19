/*
  LoginPage.tsx
  Renders the administrator login.
*/

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api";
import logo from "../../assets/matam-logo-transparent.png";
import * as adminApi from "../adminApi";
import type { AdminIdentity } from "../adminApi";
import { useAdminText } from "../helpers";

// ---------------- Function 1: Administrator login form ----------------
export default function LoginPage({ onLogin }: { onLogin: (admin: AdminIdentity) => void }) {
  const c = useAdminText();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);

  // ---------------- Method 1: Submit administrator credentials ----------------
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { onLogin(await adminApi.login(username, password)); } catch (failure) { setError(failure instanceof ApiError && failure.code === "UNAUTHORIZED" ? c.invalidLogin : c.connectionError); } finally { setBusy(false); } };

  // Disable repeat submissions while the session request is in flight.
  return <main id="main-content" className="admin-login" tabIndex={-1}><form className="admin-login-card" onSubmit={submit} aria-busy={busy}><img src={logo} alt="" /><span className="eyebrow">{c.admin}</span><h1>{c.login}</h1><label>{c.username}<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoFocus /></label><label>{c.password}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><p className="error" role="alert">{error}</p><button className="primary-button" disabled={busy}>{busy ? c.signingIn : c.signIn}</button><Link to="/">{c.publicSite}</Link></form></main>;
}
