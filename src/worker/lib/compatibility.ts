import { eq } from "drizzle-orm";
import type { Db } from "../db";
import type { Env } from "../env";
import { outfits, garments } from "../db/schema";
import { embed } from "./ai";

// Style compatibility between two users, 0..100. Combines overlap in brands and
// aesthetics with an optional semantic similarity of their overall style text.
// The brand/aesthetic math is deterministic so it works without any AI service;
// the semantic term is added only when embeddings are available.

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

// Cosine similarity of two equal-length vectors, clamped to 0..1.
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(na) * Math.sqrt(nb))));
}

// Optional semantic similarity between two users' style profiles, or null when
// embeddings are unavailable.
async function semanticSimilarity(
  env: Env,
  a: { aesthetics: Set<string>; brands: Set<string> },
  b: { aesthetics: Set<string>; brands: Set<string> }
): Promise<number | null> {
  const textA = [...a.aesthetics, ...a.brands].join(" ");
  const textB = [...b.aesthetics, ...b.brands].join(" ");
  if (!textA || !textB) return null;
  const [va, vb] = await Promise.all([embed(env, textA), embed(env, textB)]);
  if (!va || !vb) return null;
  return cosine(va, vb);
}

export interface Compatibility {
  score: number; // 0..100
  sharedBrands: string[];
  sharedAesthetics: string[];
}

export async function computeCompatibility(
  db: Db,
  env: Env,
  userA: string,
  userB: string
): Promise<Compatibility> {
  const [a, b] = await Promise.all([styleSets(db, userA), styleSets(db, userB)]);

  const brandScore = jaccard(a.brands, b.brands);
  const aestheticScore = jaccard(a.aesthetics, b.aesthetics);
  const semantic = await semanticSimilarity(env, a, b);

  // Without semantics: aesthetics 60%, brands 40%. With semantics available,
  // blend it in as a third of the score.
  const combined =
    semantic === null
      ? aestheticScore * 0.6 + brandScore * 0.4
      : aestheticScore * 0.4 + brandScore * 0.27 + semantic * 0.33;

  const sharedBrands = [...a.brands].filter((x) => b.brands.has(x));
  const sharedAesthetics = [...a.aesthetics].filter((x) => b.aesthetics.has(x));

  return {
    score: Math.round(combined * 100),
    sharedBrands,
    sharedAesthetics,
  };
}
