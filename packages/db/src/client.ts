/*
  client.ts
  Creates the Postgres connection and Drizzle client used by the API.
*/

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

// ---------------- Setup 1: Postgres driver connection ----------------
// Fail fast if the connection string is missing instead of connecting blind.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
// Opens the actual TCP connection/pool to Postgres via the postgres.js driver.
const client = postgres(connectionString);

// ---------------- Setup 2: Drizzle client ----------------
// Wraps the raw driver connection with our typed schema so the rest of the
// app queries the database through a single, type-safe `db` object.
export const db = drizzle(client, { schema });
