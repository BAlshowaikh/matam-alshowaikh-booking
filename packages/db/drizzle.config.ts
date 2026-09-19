/*
  drizzle.config.ts
  Configuration for the drizzle-kit CLI (migration generation/apply).
  Not imported by the running app — only used when invoking drizzle-kit.
*/

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "node:path";

// ---------------- Setup 1: Load root .env ----------------
// drizzle-kit runs standalone from this package's folder, so it doesn't
// automatically inherit the repo-root .env the way apps/api will.
config({ path: path.resolve(process.cwd(), "../../.env") });

// ---------------- Setup 2: drizzle-kit config ----------------
// Points drizzle-kit at our schema, where to write migration files, and
// which live database to generate/apply migrations against.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
