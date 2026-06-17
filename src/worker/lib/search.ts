import { eq } from "drizzle-orm";
import type { Env } from "../env";
import type { Db } from "../db";
import { outfits, garments } from "../db/schema";
import { embed } from "./ai";

// Builds a text representation of an outfit (caption, facets, garment brands +
// names) used both for embedding and as a fallback keyword haystack.
export async function outfitText(db: Db, outfitId: string): Promise<string> {
  const outfit = await db.select().from(outfits).where(eq(outfits.id, outfitId)).get();
  if (!outfit) return "";
  const items = await db
    .select({ name: garments.name, brand: garments.brand })
    .from(garments)
    .where(eq(garments.outfitId, outfitId))
    .all();
  const pieces = items.map((g) => [g.brand, g.name].filter(Boolean).join(" ")).join(", ");
  return [outfit.caption, outfit.aesthetic, outfit.occasion, pieces]
    .filter(Boolean)
    .join(" · ");
}

// Upserts an outfit's embedding into Vectorize. No-op when AI/Vectorize aren't
// available, so uploads never fail because of search indexing.
export async function indexOutfit(env: Env, db: Db, outfitId: string, userId: string) {
  if (!env.VECTORIZE) return;
  const text = await outfitText(db, outfitId);
  if (!text) return;
  const vector = await embed(env, text);
  if (!vector) return;

  try {
    await env.VECTORIZE.upsert([
      { id: outfitId, values: vector, metadata: { userId } },
    ]);
  } catch {
    // Indexing is best-effort.
  }
}

// Removes an outfit's embedding (called on delete).
export async function deindexOutfit(env: Env, outfitId: string) {
  if (!env.VECTORIZE) return;
  try {
    await env.VECTORIZE.deleteByIds([outfitId]);
  } catch {
    // best-effort
  }
}

// Returns outfit ids semantically similar to a query, or null when semantic
// search is unavailable so callers can fall back to keyword-only.
export async function semanticSearch(
  env: Env,
  query: string,
  topK = 30
): Promise<string[] | null> {
  if (!env.VECTORIZE) return null;
  const vector = await embed(env, query);
  if (!vector) return null;
  try {
    const res = await env.VECTORIZE.query(vector, { topK });
    return res.matches.map((m) => m.id);
  } catch {
    return null;
  }
}
