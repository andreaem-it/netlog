import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { orderedPair } from "@/features/profiles/policy";
import { createNotification } from "@/features/notifications/service";
import { messageSchema } from "./schemas";

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
      const conversation = await tx.conversation.upsert({
        where: { userLowId_userHighId: pair },
        create: pair,
        update: {},
        select: { id: true },
      });
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
