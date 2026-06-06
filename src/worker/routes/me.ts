import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
import { getDb } from "../db";
import { users } from "../db/schema";
import type { UserProfile } from "../../shared/types";

const me = new Hono<{ Bindings: Env; Variables: AuthVars }>();

me.use("*", requireAuth);

// Returns the signed-in user's profile (created on first login by the auth
// middleware). The client uses this to know who it's acting as.
me.get("/", (c) => {
  const u = c.get("user");
  const profile: UserProfile = {
    id: u.id,
    email: u.email,
    handle: u.handle,
    displayName: u.displayName,
    isPrivate: u.isPrivate,
    createdAt: u.createdAt,
  };
  return c.json(profile);
});

// Update the caller's own profile (display name, bio, privacy).
me.patch("/", async (c) => {
  const u = c.get("user");
  const body = await c.req.json<{
    displayName?: string;
    bio?: string | null;
    isPrivate?: boolean;
  }>();

  const db = getDb(c.env);
  await db
    .update(users)
    .set({
      displayName: body.displayName?.trim() || u.displayName,
      bio: body.bio !== undefined ? body.bio : u.bio,
      isPrivate: body.isPrivate !== undefined ? body.isPrivate : u.isPrivate,
    })
    .where(eq(users.id, u.id));
  return c.json({ ok: true });
});

export default me;
