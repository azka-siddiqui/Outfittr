import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../env";
import * as schema from "./schema";

// Wraps the D1 binding in a Drizzle client with our schema attached. Created
// per request (D1Database is cheap to wrap) and passed around the API.
export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
