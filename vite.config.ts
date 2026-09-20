import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: ["es2020", "safari14", "ios14"],
    cssTarget: ["safari14", "ios14"],
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    strictPort: true
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
    strictPort: true
  }
});
