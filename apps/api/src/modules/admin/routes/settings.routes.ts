/*
  settings.routes.ts
  Admin-only endpoints for reading and updating general system settings
  (e.g. booking limits) stored as flexible key/value rows.
*/

import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { requireAdmin } from "../../../plugins/auth.plugin.js";
import { getSetting, listSettings, setSetting } from "../services/settings.service.js";

const keyParamsSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 200 }),
});

const setSettingBodySchema = Type.Object({
  value: Type.Unknown(),
});

// ---------------- Admin settings routes ----------------
export const settingsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook("preHandler", requireAdmin);

  // ---------------- Route 1: GET /admin/settings ----------------
  app.get("/admin/settings", async () => {
    return listSettings();
  });

  // ---------------- Route 2: GET /admin/settings/:key ----------------
  app.get("/admin/settings/:key", { schema: { params: keyParamsSchema } }, async (request, reply) => {
    const setting = await getSetting(request.params.key);
    if (!setting) {
      return reply.code(404).send({ error: "No setting exists for that key." });
    }
    return setting;
  });

  // ---------------- Route 3: PUT /admin/settings/:key ----------------
  app.put(
    "/admin/settings/:key",
    { schema: { params: keyParamsSchema, body: setSettingBodySchema } },
    async (request) => {
      const { key } = request.params;
      const { value } = request.body;
      return setSetting(key, value, request.admin!.id);
    },
  );
};
