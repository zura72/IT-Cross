// web/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/chatbot/",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { "/api": "http://localhost:4000" },
  },
});
