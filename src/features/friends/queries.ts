import "server-only";
import { db } from "@/server/db/client";
import { orderedPair } from "@/features/profiles/policy";

export type Relationship =
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "pending_outgoing"; requestId: string }
  | { kind: "pending_incoming"; requestId: string }
  | { kind: "none" };

// Called only for profiles that already rendered (getProfile hides blocked
// relationships as 404), so a block in either direction never reaches here.
export async function getRelationship(
  viewerId: string,
  targetUsername: string,
): Promise<Relationship> {
  const target = await db.user.findFirst({
    where: { profile: { username: targetUsername } },
    select: { id: true },
  });
  if (!target) return { kind: "none" };
  const targetId = target.id;
  if (viewerId === targetId) return { kind: "self" };
  const [friendship, request] = await Promise.all([
    db.friendship.findUnique({
      where: { userLowId_userHighId: orderedPair(viewerId, targetId) },
      select: { id: true },
    }),
    db.friendRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          { senderId: viewerId, recipientId: targetId },
          { senderId: targetId, recipientId: viewerId },
        ],
      },
      select: { id: true, senderId: true },
    }),
  ]);
  if (friendship) return { kind: "friends" };
  if (request)
    return request.senderId === viewerId
      ? { kind: "pending_outgoing", requestId: request.id }
      : { kind: "pending_incoming", requestId: request.id };
  return { kind: "none" };
}

const FRIENDS_PAGE_SIZE = 30;

export async function listFriends(userId: string, cursor?: string) {
  const rows = await db.friendship.findMany({
    where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: FRIENDS_PAGE_SIZE + 1,
    select: {
      id: true,
      userLowId: true,
      userHighId: true,
      userLow: {
        select: {
          name: true,
          profile: {
            select: { username: true, avatar: { select: { storageKey: true } } },
          },
        },
      },
      userHigh: {
        select: {
          name: true,
          profile: {
            select: { username: true, avatar: { select: { storageKey: true } } },
          },
        },
      },
    },
  });
  const hasMore = rows.length > FRIENDS_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FRIENDS_PAGE_SIZE) : rows;
  return {
    friends: page.map((row) => {
      const other = row.userLowId === userId ? row.userHigh : row.userLow;
      return {
        friendshipId: row.id,
        name: other.name,
        username: other.profile?.username ?? "",
        avatarUrl: other.profile?.avatar?.storageKey ?? null,
      };
    }),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

export async function listPendingRequests(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    db.friendRequest.findMany({
      where: { recipientId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        sender: {
          select: {
            name: true,
            profile: {
              select: { username: true, avatar: { select: { storageKey: true } } },
            },
          },
        },
      },
    }),
    db.friendRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        recipient: {
          select: {
            name: true,
            profile: {
              select: { username: true, avatar: { select: { storageKey: true } } },
            },
          },
        },
      },
    }),
  ]);
  return {
    incoming: incoming.map((request) => ({
      requestId: request.id,
      name: request.sender.name,
      username: request.sender.profile?.username ?? "",
      avatarUrl: request.sender.profile?.avatar?.storageKey ?? null,
      createdAt: request.createdAt,
    })),
    outgoing: outgoing.map((request) => ({
      requestId: request.id,
      name: request.recipient.name,
      username: request.recipient.profile?.username ?? "",
      avatarUrl: request.recipient.profile?.avatar?.storageKey ?? null,
      createdAt: request.createdAt,
    })),
  };
}

export async function listBlockedUsers(userId: string) {
  const blocks = await db.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      blocked: {
        select: {
          id: true,
          name: true,
          profile: {
            select: { username: true, avatar: { select: { storageKey: true } } },
          },
        },
      },
    },
  });
  return blocks.map((block) => ({
    userId: block.blocked.id,
    name: block.blocked.name,
    username: block.blocked.profile?.username ?? "",
    avatarUrl: block.blocked.profile?.avatar?.storageKey ?? null,
  }));
}
