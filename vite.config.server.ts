import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server build configuration
export default defineConfig({
  build: {
    lib: {
      entry: "./server/node-build.ts",
      name: "server",
      fileName: "node-build",
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: (id) => {
        // Keep local files
        if (id.startsWith(".") || id.startsWith("/")) return false;
        // Keep @shared alias
        if (id.startsWith("@shared")) return false;
        // External everything else (all npm packages)
        return true;
      },
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
