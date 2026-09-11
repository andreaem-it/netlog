import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { orderedPair } from "@/features/profiles/policy";
import { createNotification } from "@/features/notifications/service";
import { groupSchema, messageSchema } from "./schemas";

export class MessageActionError extends Error {}

async function canMessage(actorId: string, targetId: string) {
  const [block, target, friendship] = await Promise.all([
    db.block.findFirst({
      where: {
        OR: [
          { blockerId: actorId, blockedId: targetId },
          { blockerId: targetId, blockedId: actorId },
        ],
      },
      select: { id: true },
    }),
    db.profile.findUnique({
      where: { userId: targetId },
      select: { messagePermission: true },
    }),
    db.friendship.findUnique({
      where: { userLowId_userHighId: orderedPair(actorId, targetId) },
      select: { id: true },
    }),
  ]);
  if (block || !target) return false;
  if (target.messagePermission === "NOBODY") return false;
  if (target.messagePermission === "FRIENDS") return Boolean(friendship);
  return true;
}

// Direct conversations are keyed by the canonical ordered pair, but that
// pair can only be a real DB unique constraint conditionally (WHERE
// is_group = false), which Prisma can't declare — so this does its own
// find-then-create-with-retry instead of relying on an upsert.
async function findOrCreateDirectConversation(
  tx: Prisma.TransactionClient,
  pair: { userLowId: string; userHighId: string },
) {
  const existing = await tx.conversation.findFirst({
    where: { isGroup: false, ...pair },
    select: { id: true },
  });
  if (existing) return existing;
  try {
    return await tx.conversation.create({
      data: { ...pair, isGroup: false },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const retried = await tx.conversation.findFirst({
        where: { isGroup: false, ...pair },
        select: { id: true },
      });
      if (retried) return retried;
    }
    throw error;
  }
}

async function resolveUserId(username: string) {
  const user = await db.user.findFirst({
    where: { profile: { username }, status: "ACTIVE" },
    select: { id: true },
  });
  if (!user) throw new MessageActionError("Utente non trovato.");
  return user.id;
}

export async function sendMessage(
  actorId: string,
  targetUsername: string,
  input: unknown,
) {
  const targetId = await resolveUserId(targetUsername);
  if (targetId === actorId)
    throw new MessageActionError("Non puoi scrivere a te stesso.");
  if (!(await canMessage(actorId, targetId)))
    throw new MessageActionError("Non puoi scrivere a questa persona.");
  const data = messageSchema.parse(input);
  const pair = orderedPair(actorId, targetId);
  let result: { conversationId: string; messageId: string };
  let isRetry = false;
  try {
    result = await db.$transaction(async (tx) => {
      const conversation = await findOrCreateDirectConversation(tx, pair);
      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: pair.userLowId },
          { conversationId: conversation.id, userId: pair.userHighId },
        ],
        skipDuplicates: true,
      });
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: actorId,
          clientId: data.clientId,
          body: data.body,
        },
        select: { id: true },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      return { conversationId: conversation.id, messageId: message.id };
    });
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    )
      throw error;
    // Same clientId resubmitted (retry): the message already exists.
    const existing = await db.message.findFirst({
      where: {
        conversation: { userLowId: pair.userLowId, userHighId: pair.userHighId },
        senderId: actorId,
        clientId: data.clientId,
      },
      select: { id: true, conversationId: true },
    });
    if (!existing) throw error;
    result = { conversationId: existing.conversationId, messageId: existing.id };
    isRetry = true;
  }
  if (!isRetry)
    await createNotification({ recipientId: targetId, actorId, type: "MESSAGE" });
  return result;
}

// Groups are trust-gated the same way direct messages are (friends only),
// just applied to every invited member instead of a single recipient — no
// open invites, avoids someone being added to a group by a stranger.
export async function createGroupConversation(actorId: string, input: unknown) {
  const data = groupSchema.parse(input);
  const members = await db.user.findMany({
    where: {
      profile: { username: { in: data.memberUsernames } },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (members.length !== new Set(data.memberUsernames).size)
    throw new MessageActionError("Uno degli utenti scelti non è stato trovato.");
  const friendships = await db.friendship.findMany({
    where: { OR: members.map((m) => orderedPair(actorId, m.id)) },
    select: { id: true },
  });
  if (friendships.length !== members.length)
    throw new MessageActionError("Puoi aggiungere al gruppo solo i tuoi amici.");
  const memberIds = [actorId, ...members.map((m) => m.id)];
  return db.conversation.create({
    data: {
      isGroup: true,
      name: data.name,
      createdById: actorId,
      participants: { create: memberIds.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });
}

export async function sendGroupMessage(
  actorId: string,
  conversationId: string,
  input: unknown,
) {
  const data = messageSchema.parse(input);
  const membership = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: actorId } },
    select: { conversation: { select: { isGroup: true } } },
  });
  if (!membership?.conversation.isGroup)
    throw new MessageActionError("Questo gruppo non è più disponibile.");
  let messageId: string;
  try {
    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: actorId, clientId: data.clientId, body: data.body },
        select: { id: true },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
      return created;
    });
    messageId = message.id;
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    )
      throw error;
    const existing = await db.message.findFirst({
      where: { conversationId, senderId: actorId, clientId: data.clientId },
      select: { id: true },
    });
    if (!existing) throw error;
    messageId = existing.id;
  }
  const others = await db.conversationParticipant.findMany({
    where: { conversationId, userId: { not: actorId } },
    select: { userId: true },
  });
  await Promise.all(
    others.map((o) =>
      createNotification({ recipientId: o.userId, actorId, type: "MESSAGE" }),
    ),
  );
  return { conversationId, messageId };
}

export async function leaveGroupConversation(actorId: string, conversationId: string) {
  const result = await db.conversationParticipant.deleteMany({
    where: { conversationId, userId: actorId, conversation: { isGroup: true } },
  });
  if (result.count === 0)
    throw new MessageActionError("Non fai parte di questo gruppo.");
}

const TYPING_WINDOW_MS = 6_000;

export async function setTyping(actorId: string, conversationId: string) {
  await db.conversationParticipant.updateMany({
    where: { conversationId, userId: actorId },
    data: { typingUntil: new Date(Date.now() + TYPING_WINDOW_MS) },
  });
}

export async function markConversationRead(actorId: string, conversationId: string) {
  const lastMessage = await db.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!lastMessage) return;
  await db.conversationParticipant.updateMany({
    where: { conversationId, userId: actorId },
    data: { lastReadMessageId: lastMessage.id },
  });
}
