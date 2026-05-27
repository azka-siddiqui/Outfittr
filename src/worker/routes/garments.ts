import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { garments, outfits } from "../db/schema";
import type { Garment } from "../db/schema";
import { newId } from "../lib/id";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

interface GarmentInput {
  name: string;
  brand?: string | null;
  store?: string | null;
  priceCents?: number | null;
  size?: string | null;
  pinX?: number | null;
  pinY?: number | null;
}

// Confirms the caller owns the outfit a garment belongs to.
async function ownsOutfit(
  db: ReturnType<typeof getDb>,
  userId: string,
  outfitId: string
): Promise<boolean> {
  const outfit = await db.select().from(outfits).where(eq(outfits.id, outfitId)).get();
  return !!outfit && outfit.userId === userId;
}

// Clamp pin coordinates to the 0..1 range so a bad client can't store a pin
// off the photo.
function clampPin(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return Math.min(1, Math.max(0, v));
}

// Add a garment (with an optional pin position) to an outfit.
route.post("/outfit/:outfitId", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const outfitId = c.req.param("outfitId");

  if (!(await ownsOutfit(db, user.id, outfitId))) {
    return c.json({ error: "not found" }, 404);
  }

  const body = await c.req.json<GarmentInput>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  const garment: Garment = {
    id: newId(),
    outfitId,
    name: body.name.trim(),
    brand: body.brand ?? null,
    store: body.store ?? null,
    priceCents: body.priceCents ?? null,
    size: body.size ?? null,
    pinX: clampPin(body.pinX),
    pinY: clampPin(body.pinY),
  };
  await db.insert(garments).values(garment);
  return c.json(garment, 201);
});

// Update a garment's tags or pin position.
route.put("/:id", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const id = c.req.param("id");

  const existing = await db.select().from(garments).where(eq(garments.id, id)).get();
  if (!existing || !(await ownsOutfit(db, user.id, existing.outfitId))) {
    return c.json({ error: "not found" }, 404);
  }

  const body = await c.req.json<Partial<GarmentInput>>();
  await db
    .update(garments)
    .set({
      name: body.name?.trim() ?? existing.name,
      brand: body.brand ?? existing.brand,
      store: body.store ?? existing.store,
      priceCents: body.priceCents ?? existing.priceCents,
      size: body.size ?? existing.size,
      pinX: body.pinX !== undefined ? clampPin(body.pinX) : existing.pinX,
      pinY: body.pinY !== undefined ? clampPin(body.pinY) : existing.pinY,
    })
    .where(eq(garments.id, id));
  return c.json({ ok: true });
});

// Remove a garment.
route.delete("/:id", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const id = c.req.param("id");

  const existing = await db.select().from(garments).where(eq(garments.id, id)).get();
  if (!existing || !(await ownsOutfit(db, user.id, existing.outfitId))) {
    return c.json({ error: "not found" }, 404);
  }
  await db.delete(garments).where(and(eq(garments.id, id)));
  return c.json({ ok: true });
});

export default route;
