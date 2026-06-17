import { Hono } from "hono";
import { and, eq, inArray, like, or } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { outfits, users, follows, garments } from "../db/schema";
import { semanticSearch } from "../lib/search";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

type Scope = "world" | "following" | "closet";

// The set of user ids whose outfits are searchable for a given scope.
async function scopeUserIds(
  db: ReturnType<typeof getDb>,
  meId: string,
  scope: Scope
): Promise<string[] | "all"> {
  if (scope === "closet") return [meId];
  if (scope === "following") {
    const rows = await db
      .select({ id: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, meId), eq(follows.status, "accepted")))
      .all();
    return [meId, ...rows.map((r) => r.id)];
  }
  return "all"; // world: public accounts, filtered below
}

// Combined search: people (by handle), brands, and outfits. Outfit results
// merge keyword matches (D1 LIKE) with semantic matches (Vectorize), keeping
// semantic order first when available.
route.get("/", async (c) => {
  const me = c.get("user");
  const q = (c.req.query("q") ?? "").trim();
  const scope = (c.req.query("scope") as Scope) ?? "world";
  if (!q) return c.json({ people: [], outfits: [] });

  const db = getDb(c.env);
  const pattern = `%${q}%`;

  // People (always world-scoped; handles are public).
  const people = await db
    .select({ id: users.id, handle: users.handle, displayName: users.displayName })
    .from(users)
    .where(or(like(users.handle, pattern), like(users.displayName, pattern)))
    .limit(10)
    .all();

  const ids = await scopeUserIds(db, me.id, scope);

  // Keyword outfit matches: caption/aesthetic/occasion, or garment brand/name.
  const garmentHits = await db
    .select({ outfitId: garments.outfitId })
    .from(garments)
    .where(or(like(garments.brand, pattern), like(garments.name, pattern)))
    .all();
  const garmentOutfitIds = garmentHits.map((g) => g.outfitId);

  const keywordConds = [
    like(outfits.caption, pattern),
    like(outfits.aesthetic, pattern),
    like(outfits.occasion, pattern),
  ];
  if (garmentOutfitIds.length > 0) keywordConds.push(inArray(outfits.id, garmentOutfitIds));

  const scopeCond =
    ids === "all" ? eq(users.isPrivate, false) : inArray(outfits.userId, ids);

  const keywordRows = await db
    .select({ outfit: outfits })
    .from(outfits)
    .innerJoin(users, eq(users.id, outfits.userId))
    .where(and(or(...keywordConds), scopeCond))
    .limit(40)
    .all();

  const byId = new Map(keywordRows.map((r) => [r.outfit.id, r.outfit]));

  // Semantic matches, if Vectorize is available. Keep those we can see + hydrate.
  const semanticIds = await semanticSearch(c.env, q);
  const ordered: typeof keywordRows[number]["outfit"][] = [];
  const seen = new Set<string>();

  if (semanticIds) {
    for (const id of semanticIds) {
      const hit = byId.get(id);
      if (hit && !seen.has(id)) {
        ordered.push(hit);
        seen.add(id);
      }
    }
  }
  // Append remaining keyword matches not already included.
  for (const r of keywordRows) {
    if (!seen.has(r.outfit.id)) {
      ordered.push(r.outfit);
      seen.add(r.outfit.id);
    }
  }

  return c.json({ people, outfits: ordered.slice(0, 40) });
});

export default route;
