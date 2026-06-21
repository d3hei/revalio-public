import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Design preview — Boltshift-inspired analytics theme on :5175 */
export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: "public",
  build: {
    rollupOptions: {
      input: "bolt.html",
    },
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    open: "/bolt.html",
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
