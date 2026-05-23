import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { users } from "../db/schema";

// Decides whether `viewerId` may see content owned by `ownerId`.
//
// For now: the owner always can; a public account is visible to any signed-in
// user; a private account is visible only to the owner. Once the follow graph
// exists, approved followers of a private account are added here.
export async function canViewUser(
  db: Db,
  viewerId: string,
  ownerId: string
): Promise<boolean> {
  if (viewerId === ownerId) return true;

  const owner = await db.select().from(users).where(eq(users.id, ownerId)).get();
  if (!owner) return false;

  return !owner.isPrivate;
}
