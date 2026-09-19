/*
  index.ts
  Public entry point for @matam/db — re-exports the Drizzle client and
  every table/enum other packages (apps/api) are allowed to import.
*/

export * from "./client.js";
export * from "./schema.js";
