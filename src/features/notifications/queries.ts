import "server-only";
import { db } from "@/server/db/client";

const PAGE_SIZE = 30;

export async function listNotifications(userId: string, cursor?: string) {
  const rows = await db.notification.findMany({
    where: { recipientId: userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      type: true,
      createdAt: true,
      readAt: true,
      actor: {
        select: { name: true, profile: { select: { username: true } } },
      },
      postId: true,
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return {
    notifications: page.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt,
      unread: row.readAt === null,
      actorName: row.actor?.name ?? null,
      actorUsername: row.actor?.profile?.username ?? null,
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

export async function getUnreadNotificationCount(userId: string) {
  return db.notification.count({
    where: { recipientId: userId, readAt: null },
  });
}
