import type { Env } from "../env";

// Central description of how Outfittr behaves when Workers AI / Vectorize are
// not configured. Every AI-backed feature has a deterministic path so the app
// stays fully usable without any AI binding:
//
//   - metadata autosuggest -> returns a neutral guess (occasion "casual")
//   - cutouts               -> disabled (503), the original photo is used
//   - style DNA             -> stats computed from D1, templated summary
//   - stylist               -> points at the user's most recent real outfits
//   - semantic search       -> keyword-only (D1 LIKE) results
//   - compatibility         -> brand + aesthetic overlap only (no embedding)
//
// This helper is the single source of truth the /api/status endpoint and the
// client use to decide whether to surface "AI features limited" messaging.

export interface Capabilities {
  ai: boolean;
  vectorize: boolean;
  aiGateway: boolean;
}

export function capabilities(env: Env): Capabilities {
  return {
    ai: !!env.AI,
    vectorize: !!env.VECTORIZE,
    aiGateway: !!env.AI_GATEWAY_ID,
  };
}
