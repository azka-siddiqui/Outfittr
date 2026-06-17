import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { users, outfits, follows } from "../db/schema";
import { canViewUser } from "../lib/visibility";
import { computeCompatibility } from "../lib/compatibility";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// A user's public profile by handle: basic info, follow counts, the viewer's
// relationship to them, and their outfits if the viewer is allowed to see them.
route.get("/:handle", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);

  const profile = await db
    .select()
    .from(users)
    .where(eq(users.handle, c.req.param("handle")))
    .get();
  if (!profile) return c.json({ error: "not found" }, 404);

  const [followers] = await db
    .select({ n: sql<number>`count(*)` })
    .from(follows)
    .where(and(eq(follows.followingId, profile.id), eq(follows.status, "accepted")));
  const [following] = await db
    .select({ n: sql<number>`count(*)` })
    .from(follows)
    .where(and(eq(follows.followerId, profile.id), eq(follows.status, "accepted")));

  const rel = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, me.id), eq(follows.followingId, profile.id)))
    .get();

  const canView = await canViewUser(db, me.id, profile.id);
  const looks = canView
    ? await db
        .select()
        .from(outfits)
        .where(eq(outfits.userId, profile.id))
        .orderBy(desc(outfits.createdAt))
        .limit(60)
        .all()
    : [];

  return c.json({
    id: profile.id,
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    isPrivate: profile.isPrivate,
    isSelf: profile.id === me.id,
    followStatus: rel?.status ?? "none",
    followers: followers?.n ?? 0,
    following: following?.n ?? 0,
    canView,
    outfits: looks,
  });
});

// Style compatibility between the caller and another user.
route.get("/:handle/compatibility", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const other = await db
    .select()
    .from(users)
    .where(eq(users.handle, c.req.param("handle")))
    .get();
  if (!other) return c.json({ error: "not found" }, 404);
  if (other.id === me.id) {
    return c.json({ score: 100, sharedBrands: [], sharedAesthetics: [] });
  }

  const result = await computeCompatibility(db, c.env, me.id, other.id);
  return c.json(result);
});

export default route;
