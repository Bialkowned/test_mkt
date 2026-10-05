import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // BUILD_DIR is the fleet knob: a verification build names another directory instead of overwriting the one being served.
    build: { outDir: process.env.BUILD_DIR || "dist" },
    preview: {},
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_DEV_PORT || "5008"),
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:5108",
          changeOrigin: true,
        },
        "/uploads": {
          target: env.VITE_API_TARGET || "http://localhost:5108",
          changeOrigin: true,
        },
      },
    },
  };
});
