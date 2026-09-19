/*
  password.ts
  Password hashing/verification using Node's built-in crypto.scrypt — a
  deliberately slow, memory-hard algorithm suited to password storage.
  No external dependency needed.
*/

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// ---------------- Function 1: Hash a password ----------------
// Stored as "saltHex:hashHex" so verification can re-derive with the same salt.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

// ---------------- Function 2: Verify a password ----------------
// Constant-time comparison so response timing can't leak a partial hash match.
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
