import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(viteServer) {
      // Lazy load server to avoid DB init during config load
      return async () => {
        try {
          const serverModule = await import("./server/index.js");
          const socketModule = await import("./server/socket.js");

          const { app } = serverModule.createServer(false); // Don't attach Socket.io here

          // Attach Socket.io to Vite's HTTP server
          if (viteServer.httpServer) {
            socketModule.setupSocketIO(viteServer.httpServer as any);
            console.log("✅ Socket.io attached to Vite dev server");
          }

          // Add Express app as middleware to Vite dev server
          viteServer.middlewares.use(app);
        } catch (error) {
          console.error("Failed to load server modules:", error);
        }
      };
    },
  };
}
