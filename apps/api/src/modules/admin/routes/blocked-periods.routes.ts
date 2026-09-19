/*
  blocked-periods.routes.ts
  Admin-only endpoints for blocking/unblocking days or individual periods.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { specificPeriodSchema } from "../../../helpers/schemas.js";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import { blockPeriod, listBlockedPeriods, unblockPeriod } from "../services/blocked-periods.service.js";

const listQuerySchema = Type.Object({
  from: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  to: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});

const blockBodySchema = Type.Object({
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  // Omit period to block the entire day. "all" isn't offered here — it means the
  // same thing as omitting period, so the whole-day convention stays the one path.
  period: Type.Optional(specificPeriodSchema),
  reason: Type.Optional(Type.String({ maxLength: 500 })),
});

const idParamsSchema = Type.Object({
  id: Type.String({ pattern: "^[0-9a-fA-F-]{36}$" }),
});

// ---------------- Admin blocked-periods routes ----------------
export const blockedPeriodsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/blocked-periods ----------------
  app.get(
    "/admin/blocked-periods",
    { schema: { querystring: listQuerySchema } },
    async (request) => {
      const { from, to } = request.query;
      return listBlockedPeriods(from, to);
    },
  );

  // ---------------- Route 2: POST /admin/blocked-periods ----------------
  app.post(
    "/admin/blocked-periods",
    { schema: { body: blockBodySchema } },
    async (request, reply) => {
      const { date, period, reason } = request.body;
      const row = await blockPeriod(date, period, reason, request.admin!.id);
      return reply.code(201).send(row);
    },
  );

  // ---------------- Route 3: DELETE /admin/blocked-periods/:id ----------------
  app.delete(
    "/admin/blocked-periods/:id",
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const removed = await unblockPeriod(request.params.id, request.admin!.id);
      if (!removed) {
        return reply.code(404).send({ error: "Blocked period not found." });
      }
      return { ok: true };
    },
  );
};
