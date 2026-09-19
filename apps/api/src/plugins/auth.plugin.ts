/*
  auth.plugin.ts
  Reads the admin session cookie on every request and, if it's valid,
  attaches the logged-in admin to the request. Exports requireAdmin, a
  guard that protected routes use to reject unauthenticated requests.
*/

import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db, sessions, admins } from "@matam/db";

export interface AuthedAdmin {
  id: string;
  username: string;
}

declare module "fastify" {
  interface FastifyRequest {
    admin: AuthedAdmin | null;
  }
}

export const SESSION_COOKIE_NAME = "matam_session";

// ---------------- Plugin: attach request.admin from the session cookie ----------------
export default fp(async (app) => {
  await app.register(cookie);

  app.decorateRequest("admin", null);

  // Runs before every route handler so any route can just read request.admin.
  app.addHook("onRequest", async (request) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) return;

    // Joins straight to admins so an inactive/deleted admin's session stops working too.
    const [row] = await db
      .select({ adminId: admins.id, username: admins.username, isActive: admins.isActive })
      .from(sessions)
      .innerJoin(admins, eq(sessions.adminId, admins.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (row && row.isActive) {
      request.admin = { id: row.adminId, username: row.username };
    }
  });
});

// ---------------- Guard: require a logged-in admin ----------------
// Used as a route's preHandler; rejects with 401 before the handler ever runs.
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.admin) {
    return reply.code(401).send({ error: "Authentication required." });
  }
}
