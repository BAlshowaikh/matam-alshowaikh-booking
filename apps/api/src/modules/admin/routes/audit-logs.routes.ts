/*
  audit-logs.routes.ts
  Admin-only endpoint for viewing the audit history: who did what, and when.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import { listAuditLogs } from "../services/audit-logs.service.js";

const listQuerySchema = Type.Object({
  action: Type.Optional(Type.String()),
  adminId: Type.Optional(Type.String({ pattern: "^[0-9a-fA-F-]{36}$" })),
  from: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  to: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

// ---------------- Admin audit-log routes ----------------
export const auditLogsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/audit-logs ----------------
  app.get("/admin/audit-logs", { schema: { querystring: listQuerySchema } }, async (request) => {
    const { action, adminId, from, to, limit = 50, offset = 0 } = request.query;
    return listAuditLogs({ action, adminId, from, to, limit, offset });
  });
};
