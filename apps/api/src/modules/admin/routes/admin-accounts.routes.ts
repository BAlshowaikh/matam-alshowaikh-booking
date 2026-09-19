/*
  admin-accounts.routes.ts
  Admin-only endpoints for managing other administrator accounts: list,
  create, and activate/deactivate.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import { createAdmin, listAdmins, setAdminActive } from "../services/admin-accounts.service.js";

const createAdminBodySchema = Type.Object({
  username: Type.String({ minLength: 1, maxLength: 100 }),
  password: Type.String({ minLength: 8, maxLength: 200 }),
});

const idParamsSchema = Type.Object({
  id: Type.String({ pattern: "^[0-9a-fA-F-]{36}$" }),
});

// ---------------- Helper: Detect a PostgreSQL uniqueness conflict ----------------
// Drizzle may expose PostgreSQL's error code directly or through the underlying cause.
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code
    ?? (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

// ---------------- Admin accounts routes ----------------
export const adminAccountsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/admins ----------------
  app.get("/admin/admins", async () => {
    return listAdmins();
  });

  // ---------------- Route 2: POST /admin/admins ----------------
  app.post(
    "/admin/admins",
    { schema: { body: createAdminBodySchema } },
    async (request, reply) => {
      const { username, password } = request.body;
      try {
        const row = await createAdmin(username, password, request.admin!.id);
        return reply.code(201).send(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return reply.code(409).send({ error: "That username already exists." });
        }
        throw error;
      }
    },
  );

  // ---------------- Route 3: POST /admin/admins/:id/deactivate ----------------
  app.post(
    "/admin/admins/:id/deactivate",
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      if (request.params.id === request.admin!.id) {
        return reply.code(400).send({ error: "You can't deactivate your own account." });
      }
      const row = await setAdminActive(request.params.id, false, request.admin!.id);
      if (!row) return reply.code(404).send({ error: "Admin not found." });
      return row;
    },
  );

  // ---------------- Route 4: POST /admin/admins/:id/activate ----------------
  app.post(
    "/admin/admins/:id/activate",
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const row = await setAdminActive(request.params.id, true, request.admin!.id);
      if (!row) return reply.code(404).send({ error: "Admin not found." });
      return row;
    },
  );
};
