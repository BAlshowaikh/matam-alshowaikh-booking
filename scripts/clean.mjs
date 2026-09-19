/*
  clean.mjs
  Removes reproducible build output and stale TypeScript-generated configuration files.
  The targets are intentionally fixed within the repository to keep cleanup bounded and safe.
*/

import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve all cleanup targets from this script instead of relying on the caller's working directory.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedTargets = [
  "apps/api/dist",
  "apps/web/dist",
  "packages/db/dist",
  "packages/shared/dist",
  "apps/web/tsconfig.app.tsbuildinfo",
  "apps/web/tsconfig.node.tsbuildinfo",
  "apps/web/vite.config.js",
  "apps/web/vite.config.d.ts",
];

// ---------------- Function 1: Remove known generated artifacts ----------------
async function cleanGeneratedFiles() {
  // Delete each fixed target independently so missing outputs remain a normal clean state.
  for (const relativeTarget of generatedTargets) {
    await rm(path.join(repositoryRoot, relativeTarget), { recursive: true, force: true });
  }
}

await cleanGeneratedFiles();
