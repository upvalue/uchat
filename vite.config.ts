/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  base: process.env.UCHAT_BASE_PATH || "/",
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["ubot/**", "node_modules/**"],
  },
  build: {
    outDir: "web/dist",
    emptyOutDir: true,
  },
  server: {
    host :'0.0.0.0',
    allowedHosts: true,
    proxy: {
      "/graphql": {
        target: "http://localhost:6767",
        changeOrigin: true,
        ws: true,
      },
      "/data": {
        target: "http://localhost:6767",
        changeOrigin: true,
      },
    },
  },
});
