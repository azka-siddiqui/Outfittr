import { eq } from "drizzle-orm";
import type { Db } from "../db";
import type { Env } from "../env";
import { outfits, garments } from "../db/schema";
import { runText } from "./ai";

// A data-driven summary of someone's wardrobe. The stats are computed
// deterministically from D1; the narrative blurb is AI-generated when available
// and falls back to a templated sentence otherwise.
export interface StyleDna {
  outfitCount: number;
  favoriteBrands: { brand: string; count: number }[];
  aesthetics: { aesthetic: string; percent: number }[];
  occasions: { occasion: string; percent: number }[];
  summary: string;
}

function tally<T extends string>(values: (T | null)[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const v of values) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

function toPercent(m: Map<string, number>, total: number) {
  return [...m.entries()]
    .map(([k, n]) => ({ key: k, percent: total === 0 ? 0 : Math.round((n / total) * 100) }))
    .sort((a, b) => b.percent - a.percent);
}

export async function computeStyleDna(db: Db, env: Env, userId: string): Promise<StyleDna> {
  const looks = await db
    .select({ id: outfits.id, aesthetic: outfits.aesthetic, occasion: outfits.occasion })
    .from(outfits)
    .where(eq(outfits.userId, userId))
    .all();

  const total = looks.length;

  const aestheticPct = toPercent(tally(looks.map((l) => l.aesthetic)), total).map((x) => ({
    aesthetic: x.key,
    percent: x.percent,
  }));
  const occasionPct = toPercent(tally(looks.map((l) => l.occasion)), total).map((x) => ({
    occasion: x.key,
    percent: x.percent,
  }));

  // Favorite brands across all garments.
  const brandCounts = new Map<string, number>();
  for (const l of looks) {
    const items = await db
      .select({ brand: garments.brand })
      .from(garments)
      .where(eq(garments.outfitId, l.id))
      .all();
    for (const g of items) {
      if (g.brand) {
        const key = g.brand;
        brandCounts.set(key, (brandCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const favoriteBrands = [...brandCounts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topAesthetic = aestheticPct[0]?.aesthetic;
  const topBrand = favoriteBrands[0]?.brand;

  // Try an AI-written blurb; fall back to a deterministic sentence.
  let summary = fallbackSummary(total, topAesthetic, topBrand);
  const prompt = `Write a one-sentence, upbeat style summary for someone whose wardrobe is
mostly "${topAesthetic ?? "varied"}"${topBrand ? `, favoring ${topBrand}` : ""}. No hashtags.`;
  const ai = await runText(env, prompt);
  if (ai) summary = ai.trim().split("\n")[0];

  return {
    outfitCount: total,
    favoriteBrands,
    aesthetics: aestheticPct,
    occasions: occasionPct,
    summary,
  };
}

function fallbackSummary(
  total: number,
  aesthetic?: string,
  brand?: string
): string {
  if (total === 0) return "Upload some outfits to reveal your Style DNA.";
  const a = aesthetic ? `leans ${aesthetic}` : "is still taking shape";
  const b = brand ? `, with ${brand} on repeat` : "";
  return `Your style ${a}${b}.`;
}
