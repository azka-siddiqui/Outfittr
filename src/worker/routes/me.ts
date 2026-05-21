import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth, type AuthVars } from "../middleware/auth";
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

export default me;
