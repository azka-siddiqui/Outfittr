import type { Env } from "../env";
import { describeImage } from "./ai";

// Suggested metadata for a freshly uploaded photo.
export interface MetadataSuggestion {
  aesthetic: string | null;
  occasion: string | null;
  garments: string[];
  // Whether these came from the AI model or the deterministic fallback.
  source: "ai" | "fallback";
}

// A small vocabulary used both to prompt the model and to keyword-match the
// model's free text back into our facets.
const AESTHETICS = [
  "streetwear",
  "minimalist",
  "y2k",
  "old money",
  "grunge",
  "athleisure",
  "cottagecore",
  "formal",
];
const OCCASIONS = ["casual", "work", "party", "date", "workout", "formal", "travel"];
const GARMENT_WORDS = [
  "jacket",
  "coat",
  "shirt",
  "tee",
  "sweater",
  "hoodie",
  "dress",
  "skirt",
  "jeans",
  "trousers",
  "shorts",
  "sneakers",
  "boots",
  "heels",
  "bag",
  "hat",
];

function firstMatch(haystack: string, options: string[]): string | null {
  const lower = haystack.toLowerCase();
  return options.find((o) => lower.includes(o)) ?? null;
}

function matchAll(haystack: string, options: string[]): string[] {
  const lower = haystack.toLowerCase();
  return options.filter((o) => lower.includes(o));
}

// Analyzes a photo and suggests metadata. Uses Workers AI when available;
// otherwise returns a neutral deterministic guess so the upload flow still
// works offline / without an AI binding.
export async function suggestMetadata(
  env: Env,
  image: Uint8Array
): Promise<MetadataSuggestion> {
  const prompt = `You are a fashion tagger. Describe this outfit. Mention the overall
aesthetic (one of: ${AESTHETICS.join(", ")}), a likely occasion (one of:
${OCCASIONS.join(", ")}), and list the visible garments.`;

  const description = await describeImage(env, image, prompt);

  if (description) {
    return {
      aesthetic: firstMatch(description, AESTHETICS),
      occasion: firstMatch(description, OCCASIONS),
      garments: matchAll(description, GARMENT_WORDS),
      source: "ai",
    };
  }

  // Fallback: no confident guess, but keep the shape so the client is simple.
  return {
    aesthetic: null,
    occasion: "casual",
    garments: [],
    source: "fallback",
  };
}
