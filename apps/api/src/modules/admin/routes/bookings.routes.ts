/*
  bookings.routes.ts (admin)
  Admin-only booking management: list/filter, view detail, approve,
  reject, and set an internal note. All routes here require login.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { periodSchema } from "../../../helpers/schemas.js";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import {
  approveBooking,
  deleteBooking,
  getBookingById,
  listBookings,
  rejectBooking,
  setBookingNote,
} from "../services/bookings.service.js";

const idParamsSchema = Type.Object({
  id: Type.String({ pattern: "^[0-9a-fA-F-]{36}$" }),
});

const listQuerySchema = Type.Object({
  status: Type.Optional(
    Type.Union([Type.Literal("pending"), Type.Literal("approved"), Type.Literal("rejected"), Type.Literal("cancelled")]),
  ),
  period: Type.Optional(periodSchema),
  from: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  to: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 20 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

const rejectBodySchema = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 1000 })),
});

const noteBodySchema = Type.Object({
  note: Type.String({ maxLength: 2000 }),
});

const reviewErrorMessages = {
  not_found: "Booking not found.",
  not_pending: "This booking has already been reviewed.",
} as const;

// ---------------- Admin booking management routes ----------------
export const adminBookingsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Applies to every route registered in this plugin — see file header.
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/bookings ----------------
  app.get("/admin/bookings", { schema: { querystring: listQuerySchema } }, async (request) => {
    const { limit = 20, offset = 0, ...filters } = request.query;
    return listBookings({ ...filters, limit, offset });
  });

  // ---------------- Route 2: GET /admin/bookings/:id ----------------
  app.get("/admin/bookings/:id", { schema: { params: idParamsSchema } }, async (request, reply) => {
    const booking = await getBookingById(request.params.id);
    if (!booking) {
      return reply.code(404).send({ error: "Booking not found." });
    }
    return booking;
  });

  // ---------------- Route 3: POST /admin/bookings/:id/approve ----------------
  app.post(
    "/admin/bookings/:id/approve",
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const result = await approveBooking(request.params.id, request.admin!.id);
      if (result !== "ok") {
        return reply.code(result === "not_found" ? 404 : 409).send({ error: reviewErrorMessages[result] });
      }
      return { ok: true };
    },
  );

  // ---------------- Route 4: POST /admin/bookings/:id/reject ----------------
  app.post(
    "/admin/bookings/:id/reject",
    { schema: { params: idParamsSchema, body: rejectBodySchema } },
    async (request, reply) => {
      const result = await rejectBooking(request.params.id, request.admin!.id, request.body.reason);
      if (result !== "ok") {
        return reply.code(result === "not_found" ? 404 : 409).send({ error: reviewErrorMessages[result] });
      }
      return { ok: true };
    },
  );

  // ---------------- Route 5: POST /admin/bookings/:id/note ----------------
  app.post(
    "/admin/bookings/:id/note",
    { schema: { params: idParamsSchema, body: noteBodySchema } },
    async (request, reply) => {
      const result = await setBookingNote(request.params.id, request.body.note, request.admin!.id);
      if (result !== "ok") {
        return reply.code(404).send({ error: reviewErrorMessages[result] });
      }
      return { ok: true };
    },
  );

  // ---------------- Route 6: DELETE /admin/bookings/:id ----------------
  app.delete(
    "/admin/bookings/:id",
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const result = await deleteBooking(request.params.id, request.admin!.id);
      if (result !== "ok") {
        return reply.code(404).send({ error: reviewErrorMessages[result] });
      }
      return { ok: true };
    },
  );
};
