import "server-only";
import { db } from "@/server/db/client";

export async function listConversations(userId: string) {
  const participations = await db.conversationParticipant.findMany({
    where: { userId, archivedAt: null },
    select: {
      lastReadMessageId: true,
      conversation: {
        select: {
          id: true,
          userLowId: true,
          userHighId: true,
          lastMessageAt: true,
          userLow: {
            select: { name: true, profile: { select: { username: true } } },
          },
          userHigh: {
            select: { name: true, profile: { select: { username: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, senderId: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });
  const active = participations.filter((p) => p.conversation.messages.length > 0);
  const lastReadIds = active
    .map((p) => p.lastReadMessageId)
    .filter((id): id is string => id !== null);
  const lastReadRows = lastReadIds.length
    ? await db.message.findMany({
        where: { id: { in: lastReadIds } },
        select: { id: true, createdAt: true },
      })
    : [];
  const lastReadAt = new Map(lastReadRows.map((row) => [row.id, row.createdAt]));

  const withUnread = await Promise.all(
    active.map(async (p) => {
      const other =
        p.conversation.userLowId === userId
          ? p.conversation.userHigh
          : p.conversation.userLow;
      const since = p.lastReadMessageId
        ? (lastReadAt.get(p.lastReadMessageId) ?? new Date(0))
        : new Date(0);
      const unreadCount = await db.message.count({
        where: {
          conversationId: p.conversation.id,
          senderId: { not: userId },
          createdAt: { gt: since },
        },
      });
      return {
        conversationId: p.conversation.id,
        otherName: other.name,
        otherUsername: other.profile?.username ?? "",
        lastMessage: p.conversation.messages[0]!.body,
        lastMessageAt: p.conversation.messages[0]!.createdAt,
        unreadCount,
      };
    }),
  );
  return withUnread.sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
  );
}

export async function getUnreadMessageCount(userId: string) {
  const conversations = await listConversations(userId);
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

const MESSAGES_PAGE_SIZE = 50;

export async function getConversationWithUsername(
  userId: string,
  otherUsername: string,
) {
  const other = await db.user.findFirst({
    where: { profile: { username: otherUsername } },
    select: { id: true, name: true },
  });
  if (!other) return null;
  const conversation = await db.conversationParticipant.findFirst({
    where: {
      userId,
      conversation: {
        OR: [
          { userLowId: userId, userHighId: other.id },
          { userLowId: other.id, userHighId: userId },
        ],
      },
    },
    select: { conversationId: true },
  });
  return { otherId: other.id, otherName: other.name, conversationId: conversation?.conversationId ?? null };
}

export async function getMessages(conversationId: string) {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: MESSAGES_PAGE_SIZE,
    select: { id: true, body: true, senderId: true, createdAt: true },
  });
  return messages;
}
