import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { outfits, matchResults } from "../db/schema";
import { applyMatch } from "./elo";
import { newId, now } from "./id";

export type Dimension = "overall" | "aesthetic" | "occasion";

export const DIMENSIONS: Dimension[] = ["overall", "aesthetic", "occasion"];

export function isDimension(v: string): v is Dimension {
  return (DIMENSIONS as string[]).includes(v);
}

function ratingOf(outfit: typeof outfits.$inferSelect, dim: Dimension): number {
  if (dim === "overall") return outfit.eloOverall;
  if (dim === "aesthetic") return outfit.eloAesthetic;
  return outfit.eloOccasion;
}

// Builds the typed partial-update for a dimension's Elo column.
function ratingUpdate(dim: Dimension, value: number) {
  if (dim === "overall") return { eloOverall: value };
  if (dim === "aesthetic") return { eloAesthetic: value };
  return { eloOccasion: value };
}

// Records a head-to-head result: recompute both ratings for the dimension,
// persist them, and log the match. Returns the new ratings.
export async function recordMatch(
  db: Db,
  voterId: string,
  dimension: Dimension,
  winnerId: string,
  loserId: string
): Promise<{ winner: number; loser: number } | null> {
  const winner = await db.select().from(outfits).where(eq(outfits.id, winnerId)).get();
  const loser = await db.select().from(outfits).where(eq(outfits.id, loserId)).get();
  if (!winner || !loser || winner.id === loser.id) return null;

  const [newWinner, newLoser] = applyMatch(
    ratingOf(winner, dimension),
    ratingOf(loser, dimension),
    "a"
  );

  await db.update(outfits).set(ratingUpdate(dimension, newWinner)).where(eq(outfits.id, winnerId));
  await db.update(outfits).set(ratingUpdate(dimension, newLoser)).where(eq(outfits.id, loserId));

  await db.insert(matchResults).values({
    id: newId(),
    voterId,
    dimension,
    winnerId,
    loserId,
    createdAt: now(),
  });

  return { winner: newWinner, loser: newLoser };
}
