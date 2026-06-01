// Standard Elo, used for all three leaderboard dimensions (overall, aesthetic,
// occasion). Ratings start at 1200. K controls volatility: higher K means each
// match moves ratings more. 32 is a common choice for a smallish population.
export const DEFAULT_RATING = 1200;
export const K_FACTOR = 32;

// Probability that `a` beats `b` given their current ratings.
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

export type Outcome = "a" | "b";

// Returns the updated [a, b] ratings after a match. `winner` is "a" or "b".
export function applyMatch(
  ratingA: number,
  ratingB: number,
  winner: Outcome,
  k: number = K_FACTOR
): [number, number] {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  const scoreA = winner === "a" ? 1 : 0;
  const scoreB = winner === "b" ? 1 : 0;

  const newA = ratingA + k * (scoreA - expectedA);
  const newB = ratingB + k * (scoreB - expectedB);
  return [newA, newB];
}
