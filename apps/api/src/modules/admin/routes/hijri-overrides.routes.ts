/*
  hijri-overrides.routes.ts
  Admin-only endpoints for correcting the calculated Hijri date mapping to
  match the Matam's approved Shia calendar authority.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import {
  getGlobalAdjustment,
  listOverrides,
  removeOverride,
  setGlobalAdjustment,
  setOverride,
} from "../services/hijri-overrides.service.js";
import type { HijriAdjustment } from "../../../helpers/hijri-adjustment.js";

const dateParamsSchema = Type.Object({
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});

const listQuerySchema = Type.Object({
  from: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  to: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});

const setOverrideBodySchema = Type.Object({
  hijriYear: Type.Integer({ minimum: 1300, maximum: 1600 }),
  hijriMonth: Type.Integer({ minimum: 1, maximum: 12 }),
  hijriDay: Type.Integer({ minimum: 1, maximum: 30 }),
  applyForward: Type.Optional(Type.Boolean({ default: false })),
});

const setAdjustmentBodySchema = Type.Object({
  days: Type.Integer({ minimum: -2, maximum: 2 }),
});

// ---------------- Function 1: Register admin Hijri correction routes ----------------
export const hijriOverridesRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Protect every route in this module with the shared administrator session guard.
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/hijri-adjustment ----------------
  app.get("/admin/hijri-adjustment", async () => {
    return getGlobalAdjustment();
  });

  // ---------------- Route 2: PUT /admin/hijri-adjustment ----------------
  app.put(
    "/admin/hijri-adjustment",
    { schema: { body: setAdjustmentBodySchema } },
    async (request) => {
      return setGlobalAdjustment(request.body.days as HijriAdjustment, request.admin!.id);
    },
  );

  // ---------------- Route 3: GET /admin/hijri-overrides ----------------
  app.get(
    "/admin/hijri-overrides",
    { schema: { querystring: listQuerySchema } },
    async (request) => {
      const { from, to } = request.query;
      return listOverrides(from, to);
    },
  );

  // ---------------- Route 4: PUT /admin/hijri-overrides/:date ----------------
  app.put(
    "/admin/hijri-overrides/:date",
    { schema: { params: dateParamsSchema, body: setOverrideBodySchema } },
    async (request) => {
      const { date } = request.params;
      const { hijriYear, hijriMonth, hijriDay, applyForward = false } = request.body;
      return setOverride(date, { year: hijriYear, month: hijriMonth, day: hijriDay }, applyForward, request.admin!.id);
    },
  );

  // ---------------- Route 5: DELETE /admin/hijri-overrides/:date ----------------
  app.delete(
    "/admin/hijri-overrides/:date",
    { schema: { params: dateParamsSchema } },
    async (request, reply) => {
      const removed = await removeOverride(request.params.date, request.admin!.id);
      if (!removed) {
        return reply.code(404).send({ error: "No override exists for that date." });
      }
      return { ok: true };
    },
  );
};
