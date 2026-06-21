import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Design preview — PlayerZero-inspired light theme on :5174 */
export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: "public",
  build: {
    rollupOptions: {
      input: "lab.html",
    },
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    open: "/lab.html",
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
