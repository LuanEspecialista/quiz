import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/painel/",
  plugins: [react()],
  build: {
    outDir: "../painel",
    // Preserve hashed chunks while existing sessions finish using the previous build.
    // Otherwise a tab left open across deployments requests a chunk that was deleted.
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "vendor-react";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
