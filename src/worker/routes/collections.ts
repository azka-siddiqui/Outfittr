import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { collections } from "../db/schema";
import type { Collection } from "../db/schema";
import { newId, now } from "../lib/id";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// List the signed-in user's collections.
route.get("/", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, user.id))
    .all();
  return c.json(rows);
});

// Create a collection.
route.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name is required" }, 400);

  const db = getDb(c.env);
  const collection: Collection = {
    id: newId(),
    userId: user.id,
    name,
    createdAt: now(),
  };
  await db.insert(collections).values(collection);
  return c.json(collection, 201);
});

// Delete a collection the caller owns. Outfits keep existing (their
// collection_id is set to null by the FK on delete).
route.delete("/:id", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  await db
    .delete(collections)
    .where(and(eq(collections.id, c.req.param("id")), eq(collections.userId, user.id)));
  return c.json({ ok: true });
});

export default route;
