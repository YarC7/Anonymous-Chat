import path from "path";
import { createServer } from "./index";
import * as express from "express";

const { app, httpServer } = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../spa");

// Serve static files with fallback options
app.use(express.static(distPath, { 
  fallthrough: true,  // Allow requests to continue if file not found
  index: false  // Don't serve index.html automatically
}));

// Handle React Router - serve index.html for all non-API and non-static routes
app.use((req, res, next) => {
  // Skip for API routes and socket.io
  if (
    req.path.startsWith("/api/") ||
    req.path.startsWith("/health") ||
    req.path.startsWith("/socket.io/")
  ) {
    return next();
  }

  // Skip for static assets (files with extensions)
  if (path.extname(req.path)) {
    return next();
  }

  // Serve index.html for all other routes (React Router)
  res.sendFile(path.join(distPath, "index.html"));
});

httpServer.listen(port, () => {
  console.log(`🚀 Anonymous Chat server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`🔌 WebSocket: http://localhost:${port}/socket.io`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  httpServer.close(() => {
    process.exit(0);
  });
});
