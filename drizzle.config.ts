import { defineConfig } from "drizzle-kit";

// Generates SQL migrations from the schema into ./migrations, which wrangler
// applies to D1 (locally and remotely).
export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/worker/db/schema.ts",
  out: "./migrations",
});
