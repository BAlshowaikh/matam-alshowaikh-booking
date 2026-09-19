/*
  start-production.mjs
  Starts the compiled Fastify server in production mode so it also serves the built React application.
  Entry point for hosts that run the repository's root start script.
*/

// Set the production condition before loading the server and its workspace dependencies.
process.env.NODE_ENV = "production";

// Load the compiled API only after the environment is finalized.
await import("../apps/api/dist/index.js");
