import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { getDb } from "../db";
import { users } from "../db/schema";
import type { User } from "../db/schema";
import { verifyAccess } from "../lib/access";
import { handleFromEmail } from "../lib/handle";
import { newId, now } from "../lib/id";

// Context variables set by the auth middleware, so route handlers can read the
// signed-in user without re-verifying.
export type AuthVars = {
  user: User;
};

// Finds the Outfittr profile for an Access email, creating one on first login.
async function bootstrapProfile(env: Env, email: string): Promise<User> {
  const db = getDb(env);

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;

  // First login: create a profile with a unique handle derived from the email.
  let handle = handleFromEmail(email);
  const clash = await db.select().from(users).where(eq(users.handle, handle)).get();
  if (clash) {
    handle = `${handle}${Math.floor(Math.random() * 10000)}`;
  }

  const profile: User = {
    id: newId(),
    email,
    handle,
    displayName: handle,
    bio: null,
    avatarKey: null,
    isPrivate: false,
    createdAt: now(),
  };
  await db.insert(users).values(profile);
  return profile;
}

// Requires a valid Access identity and attaches the profile to the context.
// Responds 401 when the request is unauthenticated.
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AuthVars;
}>(async (c, next) => {
  const identity = await verifyAccess(c.req.raw, c.env);
  if (!identity) {
    return c.json({ error: "unauthenticated" }, 401);
  }

  const user = await bootstrapProfile(c.env, identity.email);
  c.set("user", user);
  await next();
});
