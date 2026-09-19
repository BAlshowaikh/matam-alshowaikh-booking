/*
  vite.config.ts
  Configures the frontend development server and proxies API calls to Fastify.
*/

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Keep browser requests same-origin in development to match production deployment.
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on the LAN as well as localhost so phones on the same Wi-Fi can open the development site.
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
