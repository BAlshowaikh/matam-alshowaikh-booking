/*
  index.ts
  Entry point for the Matam Alshowaikh booking API. Loads environment
  variables, creates the Fastify server instance, registers routes, and
  starts listening for requests.
*/

// Must be the first import — see env.ts for why (import evaluation order).
import "./env.js";

import Fastify from "fastify";
import type { FastifyError } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import authPlugin from "./plugins/auth.plugin.js";
import { bookingsRoutes } from "./modules/bookings/routes/bookings.routes.js";
import { adminRoutes } from "./modules/admin/routes/admin.routes.js";
import { adminAccountsRoutes } from "./modules/admin/routes/admin-accounts.routes.js";
import { adminBookingsRoutes } from "./modules/admin/routes/bookings.routes.js";
import { blockedPeriodsRoutes } from "./modules/admin/routes/blocked-periods.routes.js";
import { hijriOverridesRoutes } from "./modules/admin/routes/hijri-overrides.routes.js";
import { auditLogsRoutes } from "./modules/admin/routes/audit-logs.routes.js";
import { settingsRoutes } from "./modules/admin/routes/settings.routes.js";
import { dashboardRoutes } from "./modules/admin/routes/dashboard.routes.js";

// Create the Fastify server instance with request/response logging enabled,
// and the TypeBox type provider so route schemas double as TypeScript types.
const app = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// Normalize framework-level failures so every frontend error has a stable code
// while retaining the human-readable `error` field used by existing clients.
app.setErrorHandler((error: FastifyError, _request, reply) => {
  /*
   * Public error contract
   * - Validation failures are safe to classify but do not echo submitted values.
   * - Rate-limit failures receive their own code for localized retry guidance.
   * - Unexpected errors are logged and returned without implementation details.
   */
  if (error.validation) {
    return reply.code(400).send({ code: "VALIDATION_ERROR", error: "The submitted data is invalid." });
  }

  if (error.statusCode === 429) {
    return reply.code(429).send({ code: "RATE_LIMITED", error: "Too many requests. Please try again later." });
  }

  app.log.error(error);
  return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
    code: error.statusCode && error.statusCode < 500 ? "REQUEST_ERROR" : "INTERNAL_ERROR",
    error: error.statusCode && error.statusCode < 500 ? error.message : "An unexpected error occurred.",
  });
});

// ---------------- Function 1: Report API health ----------------
async function healthCheckHandler() {
  // Return a minimal response that monitoring systems can validate cheaply.
  return { status: "ok" };
}

// Basic health-check route — lets us (and later, a deployment platform)
// verify the API process is up and responding before wiring in real routes.
app.get("/api/health", healthCheckHandler);

// Global request cap; POST /bookings and POST /admin/login set stricter
// per-route limits since they're the abuse-sensitive ones.
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

// Attaches request.admin from the session cookie, ahead of any route that reads it.
await app.register(authPlugin);

// Registers all public booking endpoints (calendar, submit, lookup) under /api.
await app.register(bookingsRoutes, { prefix: "/api" });

// Registers admin auth endpoints (login, logout, me) under /api.
await app.register(adminRoutes, { prefix: "/api" });

// Registers admin-account management endpoints (list, create, activate/deactivate) under /api.
await app.register(adminAccountsRoutes, { prefix: "/api" });

// Registers admin booking-management endpoints (list, approve, reject, note) under /api.
await app.register(adminBookingsRoutes, { prefix: "/api" });

// Registers admin blocked-period endpoints (list, block, unblock) under /api.
await app.register(blockedPeriodsRoutes, { prefix: "/api" });

// Registers admin Hijri-date-correction endpoints (list, set, remove) under /api.
await app.register(hijriOverridesRoutes, { prefix: "/api" });

// Registers the admin audit-history endpoint under /api.
await app.register(auditLogsRoutes, { prefix: "/api" });

// Registers admin settings endpoints (list, get, set) under /api.
await app.register(settingsRoutes, { prefix: "/api" });

// Registers the admin dashboard summary endpoint under /api.
await app.register(dashboardRoutes, { prefix: "/api" });

// In production, serve the compiled React application from the same origin as the API and session cookie.
if (process.env.NODE_ENV === "production") {
  const frontendRoot = fileURLToPath(new URL("../../web/dist", import.meta.url));
  await app.register(fastifyStatic, { root: frontendRoot, prefix: "/" });

  // Return the SPA entry point for client routes, while unknown API routes keep a JSON 404 response.
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) return reply.code(404).send({ code: "NOT_FOUND", error: "Endpoint not found." });
    return reply.sendFile("index.html");
  });
}

// Port is read from the environment so it can be overridden in production;
// defaults to 3000 for local development.
const port = Number(process.env.PORT ?? 3000);

// ---------------- Function 2: Start the API server ----------------
async function startServer() {
  /*
   * Server startup
   * - Bind to all interfaces so deployments and containers can reach the API.
   * - Log and terminate on startup failure so the process is not left unhealthy.
   */
  try {
    const address = await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`api listening at ${address}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

// Start the API after all application routes and configuration are registered.
await startServer();
