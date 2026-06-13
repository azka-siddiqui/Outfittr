import type { Env } from "../env";

// Central Workers AI wrapper. Everything that touches the AI binding goes
// through here so we can (a) optionally route via an AI Gateway for caching +
// observability, and (b) degrade gracefully when AI isn't configured.

// Model ids. Kept here so swapping models is a one-line change.
export const MODELS = {
  vision: "@cf/llava-hf/llava-1.5-7b-hf",
  text: "@cf/meta/llama-3.1-8b-instruct",
  embedding: "@cf/baai/bge-base-en-v1.5",
} as const;

// Gateway options applied to every AI call when AI_GATEWAY_ID is set.
function gatewayOptions(env: Env) {
  return env.AI_GATEWAY_ID ? { gateway: { id: env.AI_GATEWAY_ID } } : undefined;
}

export function aiAvailable(env: Env): boolean {
  return !!env.AI;
}

// Runs a vision prompt over an image. Returns raw model text, or null if AI is
// unavailable so callers can fall back.
export async function describeImage(
  env: Env,
  image: Uint8Array,
  prompt: string
): Promise<string | null> {
  if (!aiAvailable(env)) return null;
  try {
    const res = (await env.AI.run(
      MODELS.vision,
      { image: [...image], prompt, max_tokens: 256 },
      gatewayOptions(env)
    )) as { description?: string };
    return res.description ?? null;
  } catch {
    return null;
  }
}

// Runs a text/instruct prompt. Returns the response text, or null on failure.
export async function runText(env: Env, prompt: string): Promise<string | null> {
  if (!aiAvailable(env)) return null;
  try {
    const res = (await env.AI.run(
      MODELS.text,
      { prompt, max_tokens: 512 },
      gatewayOptions(env)
    )) as { response?: string };
    return res.response ?? null;
  } catch {
    return null;
  }
}

// Embeds text into a vector for semantic search. Returns null on failure.
export async function embed(env: Env, text: string): Promise<number[] | null> {
  if (!aiAvailable(env)) return null;
  try {
    const res = (await env.AI.run(
      MODELS.embedding,
      { text: [text] },
      gatewayOptions(env)
    )) as { data?: number[][] };
    return res.data?.[0] ?? null;
  } catch {
    return null;
  }
}
