import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits, collections, garments } from "../db/schema";
import type { Outfit } from "../db/schema";
import { newId, now } from "../lib/id";
import { isAllowedImage, photoKey } from "../lib/media";
import { canViewUser } from "../lib/visibility";
import { suggestMetadata } from "../lib/suggest";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// List the signed-in user's closet, newest first. Filterable by collection,
// aesthetic, and occasion (all optional, combined with AND).
route.get("/", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);

  const conditions = [eq(outfits.userId, user.id)];
  const collectionId = c.req.query("collection");
  const aesthetic = c.req.query("aesthetic");
  const occasion = c.req.query("occasion");
  if (collectionId) conditions.push(eq(outfits.collectionId, collectionId));
  if (aesthetic) conditions.push(eq(outfits.aesthetic, aesthetic));
  if (occasion) conditions.push(eq(outfits.occasion, occasion));

  const rows = await db
    .select()
    .from(outfits)
    .where(and(...conditions))
    .orderBy(desc(outfits.createdAt))
    .all();
  return c.json(rows);
});

// The distinct aesthetics + occasions present in the user's closet, so the
// client can render filter chips without hard-coding a taxonomy.
route.get("/facets", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const rows = await db
    .select({ aesthetic: outfits.aesthetic, occasion: outfits.occasion })
    .from(outfits)
    .where(eq(outfits.userId, user.id))
    .all();

  const aesthetics = [...new Set(rows.map((r) => r.aesthetic).filter(Boolean))] as string[];
  const occasions = [...new Set(rows.map((r) => r.occasion).filter(Boolean))] as string[];
  return c.json({ aesthetics: aesthetics.sort(), occasions: occasions.sort() });
});

// Analyze a photo and suggest metadata (aesthetic, occasion, garments) without
// saving anything. The client calls this to pre-fill the upload form.
route.post("/suggest", async (c) => {
  const form = await c.req.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return c.json({ error: "photo file is required" }, 400);
  }
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const suggestion = await suggestMetadata(c.env, bytes);
  return c.json(suggestion);
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

// Fetch a single outfit with its garment pins. Readable by the owner or anyone
// allowed to view the owner (public accounts; approved followers later).
route.get("/:id", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const outfit = await db
    .select()
    .from(outfits)
    .where(eq(outfits.id, c.req.param("id")))
    .get();

  if (!outfit) return c.json({ error: "not found" }, 404);
  if (!(await canViewUser(db, user.id, outfit.userId))) {
    return c.json({ error: "not found" }, 404);
  }

  const pins = await db
    .select()
    .from(garments)
    .where(eq(garments.outfitId, outfit.id))
    .all();

  return c.json({ ...outfit, garments: pins });
});

// Edit an outfit's metadata (caption, aesthetic, occasion). Photo and Elo are
// left untouched here.
route.patch("/:id", async (c) => {
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

  const body = await c.req.json<{
    caption?: string | null;
    aesthetic?: string | null;
    occasion?: string | null;
  }>();

  await db
    .update(outfits)
    .set({
      caption: body.caption !== undefined ? body.caption : outfit.caption,
      aesthetic: body.aesthetic !== undefined ? body.aesthetic : outfit.aesthetic,
      occasion: body.occasion !== undefined ? body.occasion : outfit.occasion,
    })
    .where(eq(outfits.id, outfit.id));
  return c.json({ ok: true });
});

// Delete an outfit and its R2 objects. Garments are removed by the FK cascade.
route.delete("/:id", async (c) => {
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

  // Best-effort media cleanup, then remove the row.
  const keys = [outfit.photoKey, outfit.cutoutKey].filter(Boolean) as string[];
  await Promise.all(keys.map((k) => c.env.MEDIA.delete(k)));
  await db.delete(outfits).where(eq(outfits.id, outfit.id));

  return c.json({ ok: true });
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
