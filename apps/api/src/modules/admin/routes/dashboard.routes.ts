/*
  dashboard.routes.ts
  Admin-only summary endpoint for the dashboard landing page.
*/

import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import { getDashboardSummary } from "../services/bookings.service.js";

// ---------------- Admin dashboard routes ----------------
export const dashboardRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/dashboard ----------------
  app.get("/admin/dashboard", async () => {
    return getDashboardSummary();
  });
};
