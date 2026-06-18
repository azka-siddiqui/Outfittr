import { Hono } from "hono";
import { and, desc, eq, gte } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { challenges, challengeEntries, outfits } from "../db/schema";
import type { Challenge } from "../db/schema";
import { newId, now } from "../lib/id";
import { applyMatch } from "../lib/elo";
import { sql } from "drizzle-orm";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// Active challenges (not yet ended), newest first.
route.get("/", async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(challenges)
    .where(gte(challenges.endsAt, now()))
    .orderBy(desc(challenges.createdAt))
    .all();
  return c.json(rows);
});

// One challenge with its entries (outfit + current challenge Elo).
route.get("/:id", async (c) => {
  const db = getDb(c.env);
  const challenge = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, c.req.param("id")))
    .get();
  if (!challenge) return c.json({ error: "not found" }, 404);

  const entries = await db
    .select({
      id: challengeEntries.id,
      outfitId: challengeEntries.outfitId,
      userId: challengeEntries.userId,
      elo: challengeEntries.elo,
    })
    .from(challengeEntries)
    .where(eq(challengeEntries.challengeId, challenge.id))
    .orderBy(desc(challengeEntries.elo))
    .all();

  return c.json({ ...challenge, entries });
});

// Create a community challenge.
route.post("/", async (c) => {
  const me = c.get("user");
  const body = await c.req.json<{
    title: string;
    description?: string;
    aesthetic?: string;
    durationDays?: number;
  }>();
  const title = body.title?.trim();
  if (!title) return c.json({ error: "title is required" }, 400);

  const startsAt = now();
  const days = body.durationDays && body.durationDays > 0 ? body.durationDays : 7;
  const challenge: Challenge = {
    id: newId(),
    title,
    description: body.description?.trim() || null,
    type: "community",
    aesthetic: body.aesthetic?.trim() || null,
    creatorId: me.id,
    startsAt,
    endsAt: startsAt + days * 24 * 60 * 60 * 1000,
    createdAt: startsAt,
  };
  const db = getDb(c.env);
  await db.insert(challenges).values(challenge);
  return c.json(challenge, 201);
});

// Enter one of your own outfits into a challenge.
route.post("/:id/enter", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const challengeId = c.req.param("id");

  const challenge = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .get();
  if (!challenge) return c.json({ error: "challenge not found" }, 404);
  if (challenge.endsAt < now()) return c.json({ error: "challenge ended" }, 409);

  const body = await c.req.json<{ outfitId: string }>();
  const outfit = await db.select().from(outfits).where(eq(outfits.id, body.outfitId)).get();
  if (!outfit || outfit.userId !== me.id) {
    return c.json({ error: "outfit not found" }, 404);
  }

  const existing = await db
    .select()
    .from(challengeEntries)
    .where(
      and(
        eq(challengeEntries.challengeId, challengeId),
        eq(challengeEntries.outfitId, body.outfitId)
      )
    )
    .get();
  if (existing) return c.json({ ok: true, already: true });

  await db.insert(challengeEntries).values({
    id: newId(),
    challengeId,
    outfitId: body.outfitId,
    userId: me.id,
    elo: 1200,
    createdAt: now(),
  });
  return c.json({ ok: true }, 201);
});

// A random pair of entries to vote on within a challenge.
route.get("/:id/pair", async (c) => {
  const db = getDb(c.env);
  const challengeId = c.req.param("id");
  const pair = await db
    .select({
      id: challengeEntries.id,
      outfitId: challengeEntries.outfitId,
      elo: challengeEntries.elo,
    })
    .from(challengeEntries)
    .where(eq(challengeEntries.challengeId, challengeId))
    .orderBy(sql`RANDOM()`)
    .limit(2)
    .all();

  if (pair.length < 2) {
    return c.json({ error: "need at least two entries" }, 409);
  }
  return c.json(pair);
});

// Vote in a challenge matchup: updates the two entries' challenge Elo.
route.post("/:id/vote", async (c) => {
  const db = getDb(c.env);
  const challengeId = c.req.param("id");
  const body = await c.req.json<{ winnerEntryId: string; loserEntryId: string }>();
  if (!body.winnerEntryId || !body.loserEntryId || body.winnerEntryId === body.loserEntryId) {
    return c.json({ error: "winner and loser must differ" }, 400);
  }

  const winner = await db
    .select()
    .from(challengeEntries)
    .where(
      and(
        eq(challengeEntries.id, body.winnerEntryId),
        eq(challengeEntries.challengeId, challengeId)
      )
    )
    .get();
  const loser = await db
    .select()
    .from(challengeEntries)
    .where(
      and(
        eq(challengeEntries.id, body.loserEntryId),
        eq(challengeEntries.challengeId, challengeId)
      )
    )
    .get();
  if (!winner || !loser) return c.json({ error: "entry not found" }, 404);

  const [newWinner, newLoser] = applyMatch(winner.elo, loser.elo, "a");
  await db
    .update(challengeEntries)
    .set({ elo: newWinner })
    .where(eq(challengeEntries.id, winner.id));
  await db
    .update(challengeEntries)
    .set({ elo: newLoser })
    .where(eq(challengeEntries.id, loser.id));

  return c.json({ winner: newWinner, loser: newLoser });
});

// The challenge leaderboard (entries ranked by challenge Elo).
route.get("/:id/leaderboard", async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select({
      id: challengeEntries.id,
      outfitId: challengeEntries.outfitId,
      userId: challengeEntries.userId,
      elo: challengeEntries.elo,
    })
    .from(challengeEntries)
    .where(eq(challengeEntries.challengeId, c.req.param("id")))
    .orderBy(desc(challengeEntries.elo))
    .limit(50)
    .all();
  return c.json(rows);
});

export default route;
