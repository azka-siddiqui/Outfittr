import { Hono } from "hono";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits, follows, users } from "../db/schema";
import { cacheGet, cacheSet } from "../lib/cache";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

const FOLLOWING_TTL = 60; // seconds
const TRENDING_TTL = 300;

// Following feed: newest outfits from accounts the caller has an accepted
// follow with. Cached briefly per user since it changes as follows post.
route.get("/following", async (c) => {
  const me = c.get("user");
  const cacheKey = `feed:following:${me.id}`;

  const cached = await cacheGet(c.env, cacheKey);
  if (cached) return c.json(cached);

  const db = getDb(c.env);
  const following = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, me.id), eq(follows.status, "accepted")))
    .all();

  const ids = following.map((f) => f.id);
  if (ids.length === 0) {
    return c.json([]);
  }

  const rows = await db
    .select()
    .from(outfits)
    .where(inArray(outfits.userId, ids))
    .orderBy(desc(outfits.createdAt))
    .limit(50)
    .all();

  await cacheSet(c.env, cacheKey, rows, FOLLOWING_TTL);
  return c.json(rows);
});

// Trending feed: recent outfits from public accounts, ordered by overall Elo as
// a proxy for how well they've done head to head. Cached globally.
route.get("/trending", async (c) => {
  const cacheKey = "feed:trending";
  const cached = await cacheGet(c.env, cacheKey);
  if (cached) return c.json(cached);

  const db = getDb(c.env);
  const rows = await db
    .select({
      id: outfits.id,
      userId: outfits.userId,
      caption: outfits.caption,
      aesthetic: outfits.aesthetic,
      eloOverall: outfits.eloOverall,
      createdAt: outfits.createdAt,
    })
    .from(outfits)
    .innerJoin(users, eq(users.id, outfits.userId))
    .where(eq(users.isPrivate, false))
    .orderBy(desc(outfits.eloOverall))
    .limit(50)
    .all();

  await cacheSet(c.env, cacheKey, rows, TRENDING_TTL);
  return c.json(rows);
});

export default route;
