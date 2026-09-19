/*
  admin.routes.ts
  Admin authentication endpoints: login, logout, and identity check.
  Booking-management routes will be added here as they're built.
*/

import { randomBytes } from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { eq } from "drizzle-orm";
import { db, admins, sessions } from "@matam/db";
import { verifyPassword } from "../../../helpers/password.js";
import { SESSION_COOKIE_NAME, requireAdmin } from "../../../plugins/auth.plugin.js";

const loginBodySchema = Type.Object({
  username: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 1 }),
});

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export const adminRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // ---------------- Route 1: POST /admin/login ----------------
  app.post(
    "/admin/login",
    { schema: { body: loginBodySchema }, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { username, password } = request.body;
      const [admin] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);

      // Same generic error for "no such user" and "wrong password" so a login
      // attempt can't be used to discover which usernames exist.
      if (!admin || !admin.isActive || !(await verifyPassword(password, admin.passwordHash))) {
        return reply.code(401).send({ error: "Invalid username or password." });
      }

      const sessionId = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      await db.insert(sessions).values({ id: sessionId, adminId: admin.id, expiresAt });

      reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
      });

      return { username: admin.username };
    },
  );

  // ---------------- Route 2: POST /admin/logout ----------------
  app.post("/admin/logout", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  // ---------------- Route 3: GET /admin/me ----------------
  // Protected by requireAdmin — lets the frontend check "am I logged in?".
  app.get("/admin/me", { preHandler: requireAdmin }, async (request) => {
    return { username: request.admin!.username };
  });
};
