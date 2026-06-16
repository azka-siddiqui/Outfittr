import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import { outfits, garments } from "../db/schema";
import { runText } from "../lib/ai";
import { computeStyleDna } from "../lib/styledna";

const route = new Hono<{ Bindings: Env; Variables: AuthVars }>();

route.use("*", requireAuth);

// The caller's Style DNA: wardrobe stats plus a narrative summary.
route.get("/style-dna", async (c) => {
  const me = c.get("user");
  const db = getDb(c.env);
  const dna = await computeStyleDna(db, c.env, me.id);
  return c.json(dna);
});

// Builds a compact text description of the caller's closet to ground the
// stylist's answers in their real outfits.
async function closetContext(db: ReturnType<typeof getDb>, userId: string): Promise<string> {
  const looks = await db
    .select()
    .from(outfits)
    .where(eq(outfits.userId, userId))
    .orderBy(desc(outfits.createdAt))
    .limit(30)
    .all();

  const lines: string[] = [];
  for (const o of looks) {
    const items = await db
      .select({ name: garments.name, brand: garments.brand })
      .from(garments)
      .where(eq(garments.outfitId, o.id))
      .all();
    const pieces = items
      .map((g) => (g.brand ? `${g.brand} ${g.name}` : g.name))
      .join(", ");
    const facets = [o.aesthetic, o.occasion].filter(Boolean).join("/");
    lines.push(`- ${o.caption ?? "outfit"}${facets ? ` (${facets})` : ""}${pieces ? `: ${pieces}` : ""}`);
  }
  return lines.join("\n");
}

// AI stylist: answers a styling question using only the caller's actual closet
// as context. Falls back to a helpful message that still references their looks.
route.post("/stylist", async (c) => {
  const me = c.get("user");
  const body = await c.req.json<{ question: string }>();
  const question = body.question?.trim();
  if (!question) return c.json({ error: "question is required" }, 400);

  const db = getDb(c.env);
  const context = await closetContext(db, me.id);

  if (!context) {
    return c.json({
      answer: "Your closet is empty — upload a few outfits and I can style you from them.",
      source: "fallback",
    });
  }

  const prompt = `You are a personal stylist. Answer the user's question using ONLY the
outfits in their closet below. Suggest specific looks by name. Do not invent items.

Closet:
${context}

Question: ${question}`;

  const answer = await runText(c.env, prompt);
  if (answer) {
    return c.json({ answer: answer.trim(), source: "ai" });
  }

  // Deterministic fallback: point them at their most recent looks.
  const firstLine = context.split("\n")[0]?.replace(/^- /, "");
  return c.json({
    answer: `I can't reach the stylist model right now, but based on your closet, try starting with "${firstLine}".`,
    source: "fallback",
  });
});

export default route;
