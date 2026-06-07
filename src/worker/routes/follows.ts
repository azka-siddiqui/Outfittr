import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { users, follows } from "../db/schema";
import { now } from "../lib/id";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// Follow a user. Public accounts are accepted immediately; private accounts get
// a pending request the owner must approve.
route.post("/:userId", async (c) => {
  const me = c.get("user");
  const targetId = c.req.param("userId");
  if (targetId === me.id) return c.json({ error: "cannot follow yourself" }, 400);

  const db = getDb(c.env);
  const target = await db.select().from(users).where(eq(users.id, targetId)).get();
  if (!target) return c.json({ error: "not found" }, 404);

  const existing = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, me.id), eq(follows.followingId, targetId)))
    .get();
  if (existing) {
    return c.json({ status: existing.status });
  }

  const status = target.isPrivate ? "pending" : "accepted";
  await db.insert(follows).values({
    followerId: me.id,
    followingId: targetId,
    status,
    createdAt: now(),
  });
  return c.json({ status }, 201);
});

// Unfollow (or cancel a pending request).
route.delete("/:userId", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  await db
    .delete(follows)
    .where(
      and(eq(follows.followerId, me.id), eq(follows.followingId, c.req.param("userId")))
    );
  return c.json({ ok: true });
});

// Incoming pending follow requests for the caller (private account owner),
// joined to the requester's profile for display.
route.get("/requests", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const rows = await db
    .select({
      followerId: follows.followerId,
      handle: users.handle,
      displayName: users.displayName,
      createdAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followerId))
    .where(and(eq(follows.followingId, me.id), eq(follows.status, "pending")))
    .all();
  return c.json(rows);
});

// Approve a pending request.
route.post("/requests/:followerId/approve", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const followerId = c.req.param("followerId");
  const rel = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, me.id)))
    .get();
  if (!rel || rel.status !== "pending") return c.json({ error: "not found" }, 404);

  await db
    .update(follows)
    .set({ status: "accepted" })
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, me.id)));
  return c.json({ ok: true });
});

// Decline (delete) a pending request.
route.post("/requests/:followerId/decline", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const followerId = c.req.param("followerId");
  await db
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, me.id),
        eq(follows.status, "pending")
      )
    );
  return c.json({ ok: true });
});

// The relationship state between the caller and another user, for rendering the
// right follow button.
route.get("/status/:userId", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const rel = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, me.id), eq(follows.followingId, c.req.param("userId"))))
    .get();
  return c.json({ status: rel?.status ?? "none" });
});

export default route;
