import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { computeStyleDna } from "../lib/styledna";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// The caller's Style DNA: wardrobe stats plus a narrative summary.
route.get("/style-dna", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const dna = await computeStyleDna(db, c.env, me.id);
  return c.json(dna);
});

export default route;
