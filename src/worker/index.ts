import { Hono } from "hono";
import type { Env } from "./env";
import me from "./routes/me";
import outfits from "./routes/outfits";
import collections from "./routes/collections";
import garments from "./routes/garments";
import rankings from "./routes/rankings";
import follows from "./routes/follows";
import feed from "./routes/feed";
import engagement from "./routes/engagement";
import media from "./routes/media";

// One Worker serves both the API and the React app. Hono owns /api/*; anything
// else is delegated to the static assets binding (the built SPA).
const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.route("/api/me", me);
app.route("/api/outfits", outfits);
app.route("/api/collections", collections);
app.route("/api/garments", garments);
app.route("/api/rankings", rankings);
app.route("/api/follows", follows);
app.route("/api/feed", feed);
app.route("/api/engage", engagement);
app.route("/api/media", media);

// Fall through to the SPA for all non-API routes.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
