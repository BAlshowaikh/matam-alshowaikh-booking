/*
  env.ts
  Loads the repo-root .env file. Must be the first thing index.ts imports,
  since import evaluation order guarantees this runs before any other
  module (e.g. @matam/db, which reads DATABASE_URL at import time).
*/

import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Resolve the optional local file from the module location while preserving host-provided variables.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), override: false });
