import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits } from "../db/schema";
import { serveObject } from "../lib/media";
import { canViewUser } from "../lib/visibility";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// Serves an outfit's photo (or its cutout) through the Worker rather than a
// public R2 URL, so private-account media stays behind an authorization check.
route.get("/outfit/:id", async (c) => {
  const viewer = c.get("user");
  const db = getDb(c.env);

  const outfit = await db
    .select()
    .from(outfits)
    .where(eq(outfits.id, c.req.param("id")))
    .get();
  if (!outfit) return c.json({ error: "not found" }, 404);

  const allowed = await canViewUser(db, viewer.id, outfit.userId);
  if (!allowed) return c.json({ error: "forbidden" }, 403);

  // ?variant=cutout returns the AI cutout if one exists.
  const wantCutout = c.req.query("variant") === "cutout";
  const key = wantCutout && outfit.cutoutKey ? outfit.cutoutKey : outfit.photoKey;

  return serveObject(c.env, key);
});

export default route;
