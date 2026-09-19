/*
  settings.service.ts
  Database queries for the flexible key/value settings store (booking
  limits and other general configuration).
*/

import { eq } from "drizzle-orm";
import { db, settings } from "@matam/db";

// ---------------- Function 1: List every setting ----------------
export async function listSettings() {
  return db.select().from(settings);
}

// ---------------- Function 2: Get one setting by key ----------------
export async function getSetting(key: string) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row ?? null;
}

// ---------------- Function 3: Set (or replace) a setting's value ----------------
export async function setSetting(key: string, value: unknown, adminId: string) {
  const [row] = await db
    .insert(settings)
    .values({ key, value, updatedBy: adminId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy: adminId, updatedAt: new Date() },
    })
    .returning();
  return row;
}
