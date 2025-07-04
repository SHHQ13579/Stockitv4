// vite.ts
import path from "path";
import express, { type Express } from "express";
import { createServer as createViteServer } from "vite";

// Only used in development
export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);
}

// Used in production to serve built frontend
export function serveStatic(app: Express) {
  const distPath = path.resolve("dist/public");

  // Serve static files from dist/public
  app.use(express.static(distPath));

  // Handle all other routes by sending index.html (for SPA support)
  app.use("*", (_, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Simple log helper
export function log(message: string) {
  console.log(`[app] ${message}`);
}
