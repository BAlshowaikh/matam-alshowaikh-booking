/*
  admin-accounts.service.ts
  Database queries for managing administrator accounts: list, create, and
  activate/deactivate. Deactivation is used instead of deletion because
  bookings, blocked periods, and other rows reference admins by id.
*/

import { eq } from "drizzle-orm";
import { db, admins } from "@matam/db";
import { hashPassword } from "../../../helpers/password.js";
import { recordAuditLog } from "../../../helpers/audit-log.js";

const ADMIN_COLUMNS = {
  id: admins.id,
  username: admins.username,
  isActive: admins.isActive,
  createdAt: admins.createdAt,
};

// ---------------- Function 1: List every admin account ----------------
// Never selects passwordHash — this feeds an admin-facing list, not auth.
export async function listAdmins() {
  return db.select(ADMIN_COLUMNS).from(admins).orderBy(admins.createdAt);
}

// ---------------- Function 2: Create a new admin account ----------------
export async function createAdmin(username: string, password: string, creatorId: string) {
  const passwordHash = await hashPassword(password);
  const [row] = await db.insert(admins).values({ username, passwordHash }).returning(ADMIN_COLUMNS);
  await recordAuditLog("admin_created", creatorId, row.id, { username });
  return row;
}

// ---------------- Function 3: Activate or deactivate an admin account ----------------
export async function setAdminActive(id: string, isActive: boolean, actorId: string) {
  const [row] = await db
    .update(admins)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(admins.id, id))
    .returning(ADMIN_COLUMNS);
  if (!row) return null;

  await recordAuditLog(isActive ? "admin_activated" : "admin_deactivated", actorId, id);
  return row;
}
