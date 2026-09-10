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

// Owner-only DTO for the edit form: includes birthDate, never shown publicly.
export async function getOwnProfile(userId: string) {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: {
      username: true,
      bio: true,
      city: true,
      birthDate: true,
      visibility: true,
      user: { select: { name: true } },
    },
  });
  if (!profile) return null;
  return {
    username: profile.username,
    name: profile.user.name,
    bio: profile.bio,
    city: profile.city,
    birthDate: profile.birthDate,
    visibility: profile.visibility,
  };
}

const SEARCH_PAGE_SIZE = 20;

// Search is intentionally limited to public + discoverable profiles: computing
// friends-only visibility per row would mean an N+1 friendship check.
export async function searchProfiles(input: {
  query: string;
  viewerId?: string;
  cursor?: string;
}) {
  const query = input.query.trim();
  if (!query) return { profiles: [], nextCursor: null };
  let excludedIds: string[] = [];
  if (input.viewerId) {
    const blocks = await db.block.findMany({
      where: {
        OR: [
          { blockerId: input.viewerId },
          { blockedId: input.viewerId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    excludedIds = blocks.map((block) =>
      block.blockerId === input.viewerId ? block.blockedId : block.blockerId,
    );
  }
  const rows = await db.profile.findMany({
    where: {
      discoverable: true,
      visibility: "PUBLIC",
      user: { status: "ACTIVE" },
      ...(excludedIds.length ? { userId: { notIn: excludedIds } } : {}),
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { user: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    orderBy: { username: "asc" },
    ...(input.cursor ? { cursor: { username: input.cursor }, skip: 1 } : {}),
    take: SEARCH_PAGE_SIZE + 1,
    select: { username: true, bio: true, city: true, user: { select: { name: true } } },
  });
  const hasMore = rows.length > SEARCH_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, SEARCH_PAGE_SIZE) : rows;
  return {
    profiles: page.map((row) => ({
      username: row.username,
      name: row.user.name,
      bio: row.bio,
      city: row.city,
    })),
    nextCursor: hasMore ? page[page.length - 1]!.username : null,
  };
}
