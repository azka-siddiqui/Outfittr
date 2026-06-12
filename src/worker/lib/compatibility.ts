import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { outfits, garments } from "../db/schema";

// Style compatibility between two users, 0..100. Combines overlap in brands and
// aesthetics (a semantic component is layered in once Vectorize exists). The
// math is deterministic so it works without any AI service.

// Jaccard overlap of two string sets, case-insensitive.
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const v of a) if (b.has(v)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function styleSets(db: Db, userId: string) {
  const looks = await db
    .select({ id: outfits.id, aesthetic: outfits.aesthetic })
    .from(outfits)
    .where(eq(outfits.userId, userId))
    .all();

  const aesthetics = new Set<string>();
  for (const l of looks) {
    if (l.aesthetic) aesthetics.add(l.aesthetic.toLowerCase());
  }

  const brands = new Set<string>();
  for (const l of looks) {
    const items = await db
      .select({ brand: garments.brand })
      .from(garments)
      .where(eq(garments.outfitId, l.id))
      .all();
    for (const g of items) if (g.brand) brands.add(g.brand.toLowerCase());
  }

  return { aesthetics, brands };
}

export interface Compatibility {
  score: number; // 0..100
  sharedBrands: string[];
  sharedAesthetics: string[];
}

export async function computeCompatibility(
  db: Db,
  userA: string,
  userB: string
): Promise<Compatibility> {
  const [a, b] = await Promise.all([styleSets(db, userA), styleSets(db, userB)]);

  const brandScore = jaccard(a.brands, b.brands);
  const aestheticScore = jaccard(a.aesthetics, b.aesthetics);

  // Weight aesthetics a bit higher than brands — vibe matters more than labels.
  const combined = aestheticScore * 0.6 + brandScore * 0.4;

  const sharedBrands = [...a.brands].filter((x) => b.brands.has(x));
  const sharedAesthetics = [...a.aesthetics].filter((x) => b.aesthetics.has(x));

  return {
    score: Math.round(combined * 100),
    sharedBrands,
    sharedAesthetics,
  };
}
