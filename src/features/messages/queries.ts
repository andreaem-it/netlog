import "server-only";
import { db } from "@/server/db/client";

// A user counts as online if their presence heartbeat (sent every ~10s while
// the messages section is open) landed within this window.
const ONLINE_WINDOW_MS = 20_000;

function isOnline(lastSeenAt: Date | null) {
  return Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS);
}

export async function listConversations(userId: string) {
  const participations = await db.conversationParticipant.findMany({
    where: { userId, archivedAt: null },
    select: {
      lastReadMessageId: true,
      conversation: {
        select: {
          id: true,
          isGroup: true,
          name: true,
          userLowId: true,
          userHighId: true,
          lastMessageAt: true,
          userLow: {
            select: {
              name: true,
              lastSeenAt: true,
              profile: { select: { username: true, showOnline: true } },
            },
          },
          userHigh: {
            select: {
              name: true,
              lastSeenAt: true,
              profile: { select: { username: true, showOnline: true } },
            },
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
      const conversation = p.conversation;
      const other = conversation.isGroup
        ? null
        : conversation.userLowId === userId
          ? conversation.userHigh
          : conversation.userLow;
      const since = p.lastReadMessageId
        ? (lastReadAt.get(p.lastReadMessageId) ?? new Date(0))
        : new Date(0);
      const unreadCount = await db.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          createdAt: { gt: since },
        },
      });
      return {
        conversationId: conversation.id,
        isGroup: conversation.isGroup,
        title: conversation.isGroup ? conversation.name! : other!.name,
        otherUsername: conversation.isGroup ? null : (other!.profile?.username ?? ""),
        otherOnline:
          !conversation.isGroup && other!.profile?.showOnline
            ? isOnline(other!.lastSeenAt)
            : false,
        lastMessage: conversation.messages[0]!.body,
        lastMessageAt: conversation.messages[0]!.createdAt,
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
    select: {
      id: true,
      name: true,
      lastSeenAt: true,
      profile: { select: { showOnline: true } },
    },
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
  let otherTyping = false;
  if (other.profile?.showOnline && conversation) {
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.conversationId,
          userId: other.id,
        },
      },
      select: { typingUntil: true },
    });
    otherTyping = Boolean(
      participant?.typingUntil && participant.typingUntil.getTime() > Date.now(),
    );
  }
  return {
    otherId: other.id,
    otherName: other.name,
    conversationId: conversation?.conversationId ?? null,
    otherOnline: other.profile?.showOnline ? isOnline(other.lastSeenAt) : false,
    otherTyping,
  };
}

export async function getGroupConversation(userId: string, conversationId: string) {
  const membership = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: {
      conversation: {
        select: {
          id: true,
          isGroup: true,
          name: true,
          participants: {
            select: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!membership?.conversation.isGroup) return null;
  return {
    conversationId: membership.conversation.id,
    name: membership.conversation.name!,
    members: membership.conversation.participants.map((p) => p.user),
  };
}

export async function isAnyoneElseTyping(conversationId: string, excludeUserId: string) {
  const typing = await db.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: { not: excludeUserId },
      typingUntil: { gt: new Date() },
    },
    select: { userId: true },
  });
  return Boolean(typing);
}

export async function getMessages(conversationId: string) {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: MESSAGES_PAGE_SIZE,
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      sender: { select: { user: { select: { name: true } } } },
    },
  });
  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    createdAt: message.createdAt,
    senderName: message.sender.user.name,
  }));
}
