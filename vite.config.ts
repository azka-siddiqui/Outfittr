import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The client build outputs to dist/client, which the Worker serves via the
// ASSETS binding (see wrangler.jsonc). During `wrangler dev`, API requests are
// handled by the Worker and everything else falls through to the SPA.
export default defineConfig({
  plugins: [react()],
  root: "src/client",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
