import { Hono } from "hono";
import type { Env } from "./env";
import me from "./routes/me";
import outfits from "./routes/outfits";
import collections from "./routes/collections";
import garments from "./routes/garments";
import rankings from "./routes/rankings";
import follows from "./routes/follows";
import usersRoute from "./routes/users";
import feed from "./routes/feed";
import engagement from "./routes/engagement";
import intelligence from "./routes/intelligence";
import search from "./routes/search";
import challenges from "./routes/challenges";
import media from "./routes/media";
import { capabilities } from "./lib/fallback";

// One Worker serves both the API and the React app. Hono owns /api/*; anything
// else is delegated to the static assets binding (the built SPA).
const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

// Lightweight observability: reports which optional services are wired up so we
// can tell at a glance whether AI features are degraded to their fallbacks.
app.get("/api/status", (c) => {
  const env = c.env;
  const caps = capabilities(env);
  return c.json({
    status: "ok",
    services: {
      db: !!env.DB,
      media: !!env.MEDIA,
      cache: !!env.CACHE,
      ...caps,
    },
    // When AI is off, features fall back to deterministic behaviour rather than
    // failing — the client uses this to show an "AI features limited" note.
    aiDegraded: !caps.ai,
    // In dev the app trusts ACCESS_DEV_EMAIL; in prod Access verifies the JWT.
    authMode: env.ACCESS_DEV_EMAIL ? "dev" : "access",
  });
});

app.route("/api/me", me);
app.route("/api/outfits", outfits);
app.route("/api/collections", collections);
app.route("/api/garments", garments);
app.route("/api/rankings", rankings);
app.route("/api/follows", follows);
app.route("/api/users", usersRoute);
app.route("/api/feed", feed);
app.route("/api/engage", engagement);
app.route("/api/intelligence", intelligence);
app.route("/api/search", search);
app.route("/api/challenges", challenges);
app.route("/api/media", media);

// Fall through to the SPA for all non-API routes.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
