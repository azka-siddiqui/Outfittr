import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits } from "../db/schema";
import { recordMatch, isDimension, type Dimension } from "../lib/ranking";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// Returns two of the caller's outfits to compare head to head. We pick a random
// pair from their closet — enough for a personal ranking flow.
route.get("/pair", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);

  const pair = await db
    .select()
    .from(outfits)
    .where(eq(outfits.userId, user.id))
    .orderBy(sql`RANDOM()`)
    .limit(2)
    .all();

  if (pair.length < 2) {
    return c.json({ error: "need at least two outfits to compare" }, 409);
  }
  return c.json(pair);
});

// Submit a head-to-head result for a dimension. Recomputes Elo for both outfits
// and logs the match.
route.post("/vote", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    dimension: string;
    winnerId: string;
    loserId: string;
  }>();

  if (!isDimension(body.dimension)) {
    return c.json({ error: "invalid dimension" }, 400);
  }
  if (!body.winnerId || !body.loserId || body.winnerId === body.loserId) {
    return c.json({ error: "winnerId and loserId must differ" }, 400);
  }

  const db = getDb(c.env);
  // Guard: the caller can only rank their own outfits here.
  const owned = await db
    .select({ id: outfits.id })
    .from(outfits)
    .where(eq(outfits.userId, user.id))
    .all();
  const ownedIds = new Set(owned.map((o) => o.id));
  if (!ownedIds.has(body.winnerId) || !ownedIds.has(body.loserId)) {
    return c.json({ error: "not found" }, 404);
  }

  const result = await recordMatch(
    db,
    user.id,
    body.dimension,
    body.winnerId,
    body.loserId
  );
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

// Leaderboard for a dimension: the caller's outfits ranked by that Elo.
route.get("/leaderboard/:dimension", async (c) => {
  const user = c.get("user");
  const dimension = c.req.param("dimension");
  if (!isDimension(dimension)) return c.json({ error: "invalid dimension" }, 400);

  const orderCol =
    dimension === "overall"
      ? outfits.eloOverall
      : dimension === "aesthetic"
        ? outfits.eloAesthetic
        : outfits.eloOccasion;

  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(outfits)
    .where(eq(outfits.userId, user.id))
    .orderBy(desc(orderCol))
    .limit(50)
    .all();

  return c.json({ dimension: dimension as Dimension, outfits: rows });
});

export default route;
