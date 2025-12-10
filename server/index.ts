import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createHttpServer } from "http";
import { handleDemo } from "./routes/demo";
import {
  handleGoogleCallback,
  handleGetMe,
  handleLogout,
  handleUpdateProfile,
} from "./routes/auth";
import { setupSocketIO } from "./socket";

export function createServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Setup Socket.IO
  const io = setupSocketIO(httpServer);

  // Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Auth routes
  app.post("/api/auth/google/callback", handleGoogleCallback);
  app.get("/api/auth/me", handleGetMe);
  app.post("/api/auth/logout", handleLogout);
  app.post("/api/auth/profile", handleUpdateProfile);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  return httpServer;
}
