import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["framer-motion", "lucide-react"],
          wagmi: ["wagmi", "viem"],
        },
      },
    },
  },
  define: {
    global: "globalThis",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  worker: {
    format: "es" as const,
  },
  optimizeDeps: {
    exclude: ["@cofhe/sdk"],
    include: [
      "iframe-shared-storage",
      "tweetnacl",
      "zustand/vanilla",
      "zustand/middleware",
      "immer",
    ],
  },
}));
