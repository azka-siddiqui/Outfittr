// The bindings declared in wrangler.jsonc, surfaced to the Worker as a typed
// Env. Hono reads these off the request context.
export interface Env {
  // Static assets (the built React app).
  ASSETS: Fetcher;

  // Relational data (D1 + Drizzle).
  DB: D1Database;

  // Original outfit photos and generated cutouts.
  MEDIA: R2Bucket;

  // Feed + leaderboard caching.
  CACHE: KVNamespace;

  // Photo analysis, Style DNA, cutouts, AI stylist.
  AI: Ai;

  // Semantic outfit discovery.
  VECTORIZE: VectorizeIndex;

  // Cloudflare Access config.
  TEAM_DOMAIN: string;
  POLICY_AUD: string;

  // Local-only: the trusted dev user's email.
  ACCESS_DEV_EMAIL?: string;

  // Optional AI Gateway id for caching/observability.
  AI_GATEWAY_ID?: string;
}
