import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { users, follows } from "../db/schema";

// Decides whether `viewerId` may see content owned by `ownerId`.
//
// The owner always can; a public account is visible to any signed-in user; a
// private account is visible to the owner and to accepted followers.
export async function canViewUser(
  db: Db,
  viewerId: string,
  ownerId: string
): Promise<boolean> {
  if (viewerId === ownerId) return true;

  const owner = await db.select().from(users).where(eq(users.id, ownerId)).get();
  if (!owner) return false;
  if (!owner.isPrivate) return true;

  const rel = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, ownerId)))
    .get();
  return rel?.status === "accepted";
}
