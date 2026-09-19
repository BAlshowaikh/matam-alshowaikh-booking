/*
  seed-admin.ts
  One-off script that creates the first admin account from the
  ADMIN_USERNAME / ADMIN_PASSWORD env vars. Safe to re-run — skips if that
  username already exists.
*/

import "../env.js";
import { eq } from "drizzle-orm";
import { db, admins } from "@matam/db";
import { hashPassword } from "../helpers/password.js";

// ---------------- Function 1: Seed the first admin account ----------------
async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("Set ADMIN_USERNAME and ADMIN_PASSWORD in .env before running this script.");
    process.exit(1);
  }

  // Re-running the script shouldn't create duplicates or reset an existing password.
  const [existing] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  if (existing) {
    console.log(`Admin "${username}" already exists — nothing to do.`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  await db.insert(admins).values({ username, passwordHash });
  console.log(`Admin "${username}" created.`);
  process.exit(0);
}

await seedAdmin();
