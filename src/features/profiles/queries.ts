import "server-only";
import { db } from "@/server/db/client";
import { canReadProfile, orderedPair } from "./policy";

export async function getProfile(username: string, viewerId?: string) {
  const profile = await db.profile.findUnique({
    where: { username },
    select: {
      id: true,
      userId: true,
      username: true,
      bio: true,
      city: true,
      visibility: true,
      createdAt: true,
      user: { select: { name: true, status: true } },
    },
  });
  if (!profile || profile.user.status !== "ACTIVE") return null;
  const owner = profile.userId === viewerId;
  let blocked = false;
  let friends = false;
  if (viewerId && !owner) {
    const [block, friendship] = await Promise.all([
      db.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: profile.userId },
            { blockerId: profile.userId, blockedId: viewerId },
          ],
        },
        select: { id: true },
      }),
      db.friendship.findUnique({
        where: { userLowId_userHighId: orderedPair(viewerId, profile.userId) },
        select: { id: true },
      }),
    ]);
    blocked = Boolean(block);
    friends = Boolean(friendship);
  }
  if (
    !canReadProfile({ owner, blocked, friends, visibility: profile.visibility })
  )
    return null;
  // Explicit public DTO: never return email, date of birth or session data.
  return {
    username: profile.username,
    name: profile.user.name,
    bio: profile.bio,
    city: profile.city,
    visibility: profile.visibility,
    joinedAt: profile.createdAt,
    owner,
  };
}
