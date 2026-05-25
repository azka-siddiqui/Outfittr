import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits, collections } from "../db/schema";
import type { Outfit } from "../db/schema";
import { newId, now } from "../lib/id";
import { isAllowedImage, photoKey } from "../lib/media";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// List the signed-in user's closet, newest first. Optionally scoped to one
// collection via ?collection=<id>.
route.get("/", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const collectionId = c.req.query("collection");

  const where = collectionId
    ? and(eq(outfits.userId, user.id), eq(outfits.collectionId, collectionId))
    : eq(outfits.userId, user.id);

  const rows = await db
    .select()
    .from(outfits)
    .where(where)
    .orderBy(desc(outfits.createdAt))
    .all();
  return c.json(rows);
});

// Create an outfit: multipart upload with the photo plus optional metadata.
// The photo goes to R2, the row goes to D1. Garment pins are added separately.
route.post("/", async (c) => {
  const user = c.get("user");
  const form = await c.req.formData();

  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return c.json({ error: "photo file is required" }, 400);
  }
  if (!isAllowedImage(photo.type, photo.size)) {
    return c.json({ error: "photo must be jpg/png/webp and under 12MB" }, 400);
  }

  const id = newId();
  const key = photoKey(user.id, id, photo.type);

  await c.env.MEDIA.put(key, await photo.arrayBuffer(), {
    httpMetadata: { contentType: photo.type },
  });

  const caption = (form.get("caption") as string | null) || null;
  const aesthetic = (form.get("aesthetic") as string | null) || null;
  const occasion = (form.get("occasion") as string | null) || null;

  const db = getDb(c.env);
  const outfit: Outfit = {
    id,
    userId: user.id,
    collectionId: null,
    photoKey: key,
    cutoutKey: null,
    caption,
    aesthetic,
    occasion,
    eloOverall: 1200,
    eloAesthetic: 1200,
    eloOccasion: 1200,
    createdAt: now(),
  };
  await db.insert(outfits).values(outfit);

  return c.json({ id: outfit.id }, 201);
});

// Fetch a single outfit the caller owns (broader read access comes with the
// social/visibility work later).
route.get("/:id", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const outfit = await db
    .select()
    .from(outfits)
    .where(eq(outfits.id, c.req.param("id")))
    .get();

  if (!outfit || outfit.userId !== user.id) {
    return c.json({ error: "not found" }, 404);
  }
  return c.json(outfit);
});

// Move an outfit into a collection (or out of one with collectionId: null).
route.put("/:id/collection", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const body = await c.req.json<{ collectionId: string | null }>();

  const outfit = await db
    .select()
    .from(outfits)
    .where(eq(outfits.id, c.req.param("id")))
    .get();
  if (!outfit || outfit.userId !== user.id) {
    return c.json({ error: "not found" }, 404);
  }

  // Guard against assigning to a collection the caller doesn't own.
  if (body.collectionId) {
    const owned = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, body.collectionId), eq(collections.userId, user.id)))
      .get();
    if (!owned) return c.json({ error: "collection not found" }, 404);
  }

  await db
    .update(outfits)
    .set({ collectionId: body.collectionId })
    .where(eq(outfits.id, outfit.id));
  return c.json({ ok: true });
});

export default route;
