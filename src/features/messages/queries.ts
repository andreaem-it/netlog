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
          createdById: true,
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
    ownerId: membership.conversation.createdById,
    members: membership.conversation.participants.map((p) => p.user),
  };
}

// Friends of `userId` who aren't already in the group — the candidate list
// for "add people", so the UI never offers someone already a member.
export async function listAddableFriends(userId: string, conversationId: string) {
  const [friendships, participants] = await Promise.all([
    db.friendship.findMany({
      where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
      select: {
        userLowId: true,
        userHighId: true,
        userLow: {
          select: { id: true, name: true, profile: { select: { username: true } } },
        },
        userHigh: {
          select: { id: true, name: true, profile: { select: { username: true } } },
        },
      },
    }),
    db.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    }),
  ]);
  const memberIds = new Set(participants.map((p) => p.userId));
  return friendships
    .map((f) => (f.userLowId === userId ? f.userHigh : f.userLow))
    .filter((friend) => !memberIds.has(friend.id))
    .map((friend) => ({ name: friend.name, username: friend.profile?.username ?? "" }))
    .filter((friend) => friend.username);
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

// Without a cursor: the most recent page (what you see on opening a thread).
// With a cursor (a message id from a previous call's `nextCursor`): the page
// of messages older than that one — "carica messaggi precedenti".
// Previously this ordered ascending and always took the first 50 ever sent,
// so any conversation past 50 messages could never show anything newer.
export async function getMessages(conversationId: string, cursor?: string) {
  const rows = await db.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: MESSAGES_PAGE_SIZE + 1,
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      sender: { select: { user: { select: { name: true } } } },
    },
  });
  const hasMore = rows.length > MESSAGES_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, MESSAGES_PAGE_SIZE) : rows;
  return {
    messages: page
      .slice()
      .reverse()
      .map((message) => ({
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        createdAt: message.createdAt,
        senderName: message.sender.user.name,
      })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}
