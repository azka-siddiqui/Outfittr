import { Hono, type Context } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits, likes, saves, hypes, comments, users } from "../db/schema";
import { newId, now } from "../lib/id";
import { canViewUser } from "../lib/visibility";

type Ctx = Context<{ Bindings: Env; Variables: AuthVars }>;

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// Ensures the outfit exists and the caller is allowed to see it. Returns the
// outfit or null (caller should 404 on null).
async function viewableOutfit(c: Ctx, outfitId: string) {
  const db = getDb(c.env);
  const outfit = await db.select().from(outfits).where(eq(outfits.id, outfitId)).get();
  if (!outfit) return null;
  const viewer = c.get("user");
  if (!(await canViewUser(db, viewer.id, outfit.userId))) return null;
  return outfit;
}

// Aggregate engagement counts for an outfit, plus the caller's own state.
route.get("/:outfitId", async (c) => {
  const me = c.get("user");
  const outfitId = c.req.param("outfitId");
  if (!(await viewableOutfit(c, outfitId))) return c.json({ error: "not found" }, 404);

  const db = getDb(c.env);
  const [likeCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(likes)
    .where(eq(likes.outfitId, outfitId));
  const mine = await db
    .select()
    .from(likes)
    .where(and(eq(likes.outfitId, outfitId), eq(likes.userId, me.id)))
    .get();
  const saved = await db
    .select()
    .from(saves)
    .where(and(eq(saves.outfitId, outfitId), eq(saves.userId, me.id)))
    .get();
  const myHype = await db
    .select()
    .from(hypes)
    .where(and(eq(hypes.outfitId, outfitId), eq(hypes.userId, me.id)))
    .get();

  return c.json({
    likes: likeCount?.n ?? 0,
    liked: !!mine,
    saved: !!saved,
    hype: myHype?.emoji ?? null,
  });
});

// Toggle a like.
route.post("/:outfitId/like", async (c) => {
  const me = c.get("user");
  const outfitId = c.req.param("outfitId");
  if (!(await viewableOutfit(c, outfitId))) return c.json({ error: "not found" }, 404);

  const db = getDb(c.env);
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.outfitId, outfitId), eq(likes.userId, me.id)))
    .get();

  if (existing) {
    await db.delete(likes).where(and(eq(likes.outfitId, outfitId), eq(likes.userId, me.id)));
    return c.json({ liked: false });
  }
  await db.insert(likes).values({ userId: me.id, outfitId, createdAt: now() });
  return c.json({ liked: true });
});

// Toggle a save (bookmark).
route.post("/:outfitId/save", async (c) => {
  const me = c.get("user");
  const outfitId = c.req.param("outfitId");
  if (!(await viewableOutfit(c, outfitId))) return c.json({ error: "not found" }, 404);

  const db = getDb(c.env);
  const existing = await db
    .select()
    .from(saves)
    .where(and(eq(saves.outfitId, outfitId), eq(saves.userId, me.id)))
    .get();

  if (existing) {
    await db.delete(saves).where(and(eq(saves.outfitId, outfitId), eq(saves.userId, me.id)));
    return c.json({ saved: false });
  }
  await db.insert(saves).values({ userId: me.id, outfitId, createdAt: now() });
  return c.json({ saved: true });
});

// Set or clear a hype reaction (emoji). Passing an empty emoji clears it.
route.post("/:outfitId/hype", async (c) => {
  const me = c.get("user");
  const outfitId = c.req.param("outfitId");
  if (!(await viewableOutfit(c, outfitId))) return c.json({ error: "not found" }, 404);

  const body = await c.req.json<{ emoji: string }>();
  const db = getDb(c.env);

  await db.delete(hypes).where(and(eq(hypes.outfitId, outfitId), eq(hypes.userId, me.id)));
  if (body.emoji) {
    await db
      .insert(hypes)
      .values({ userId: me.id, outfitId, emoji: body.emoji, createdAt: now() });
  }
  return c.json({ hype: body.emoji || null });
});

// List comments on an outfit, oldest first, with author handles.
route.get("/:outfitId/comments", async (c) => {
  const outfitId = c.req.param("outfitId");
  if (!(await viewableOutfit(c, outfitId))) return c.json({ error: "not found" }, 404);

  const db = getDb(c.env);
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      handle: users.handle,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.outfitId, outfitId))
    .orderBy(comments.createdAt)
    .all();
  return c.json(rows);
});

// Add a comment.
route.post("/:outfitId/comments", async (c) => {
  const me = c.get("user");
  const outfitId = c.req.param("outfitId");
  if (!(await viewableOutfit(c, outfitId))) return c.json({ error: "not found" }, 404);

  const body = await c.req.json<{ body: string }>();
  const text = body.body?.trim();
  if (!text) return c.json({ error: "comment cannot be empty" }, 400);

  const db = getDb(c.env);
  const comment = {
    id: newId(),
    outfitId,
    userId: me.id,
    body: text,
    createdAt: now(),
  };
  await db.insert(comments).values(comment);
  return c.json({ ...comment, handle: me.handle }, 201);
});

// Delete a comment the caller wrote.
route.delete("/comments/:id", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  await db
    .delete(comments)
    .where(and(eq(comments.id, c.req.param("id")), eq(comments.userId, me.id)));
  return c.json({ ok: true });
});

// The caller's saved outfits.
route.get("/saved/list", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const rows = await db
    .select({ outfit: outfits })
    .from(saves)
    .innerJoin(outfits, eq(outfits.id, saves.outfitId))
    .where(eq(saves.userId, me.id))
    .orderBy(desc(saves.createdAt))
    .all();
  return c.json(rows.map((r) => r.outfit));
});

export default route;
