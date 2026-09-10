import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { orderedPair } from "@/features/profiles/policy";

export class FriendActionError extends Error {}

async function isBlocked(a: string, b: string) {
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

async function resolveUserId(username: string, requireActive: boolean) {
  const user = await db.user.findFirst({
    where: {
      profile: { username },
      ...(requireActive ? { status: "ACTIVE" } : {}),
    },
    select: { id: true },
  });
  if (!user) throw new FriendActionError("Utente non trovato.");
  return user.id;
}

export async function sendFriendRequest(actorId: string, targetUsername: string) {
  const targetId = await resolveUserId(targetUsername, true);
  const target = { id: targetId };
  if (target.id === actorId)
    throw new FriendActionError("Non puoi inviare una richiesta a te stesso.");
  if (await isBlocked(actorId, target.id))
    throw new FriendActionError("Non puoi inviare una richiesta a questo utente.");
  try {
    return await db.$transaction(async (tx) => {
      const reverse = await tx.friendRequest.findFirst({
        where: { senderId: target.id, recipientId: actorId, status: "PENDING" },
        select: { id: true },
      });
      if (reverse) {
        // Status-guarded like respondToFriendRequest: a concurrent duplicate
        // call finds 0 rows and never attempts the friendship insert.
        const updated = await tx.friendRequest.updateMany({
          where: { id: reverse.id, status: "PENDING" },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        if (updated.count === 0)
          throw new FriendActionError(
            "Avete già una richiesta o un'amicizia in corso.",
          );
        await tx.friendship.create({ data: orderedPair(actorId, target.id) });
        return { status: "friends" as const };
      }
      await tx.friendRequest.create({
        data: { senderId: actorId, recipientId: target.id },
      });
      return { status: "pending" as const };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new FriendActionError("Avete già una richiesta o un'amicizia in corso.");
    throw error;
  }
}

export async function respondToFriendRequest(
  actorId: string,
  requestId: string,
  accept: boolean,
) {
  await db.$transaction(async (tx) => {
    // Atomic status-guarded update: a concurrent duplicate submit for the
    // same request finds 0 rows here (status no longer PENDING) and bails
    // out before ever attempting to create the friendship.
    const updated = await tx.friendRequest.updateMany({
      where: { id: requestId, recipientId: actorId, status: "PENDING" },
      data: {
        status: accept ? "ACCEPTED" : "REJECTED",
        respondedAt: new Date(),
      },
    });
    if (updated.count === 0)
      throw new FriendActionError("Questa richiesta non è più disponibile.");
    if (accept) {
      const request = await tx.friendRequest.findUniqueOrThrow({
        where: { id: requestId },
      });
      await tx.friendship.create({
        data: orderedPair(request.senderId, request.recipientId),
      });
    }
  });
}

export async function cancelFriendRequest(actorId: string, requestId: string) {
  const result = await db.friendRequest.updateMany({
    where: { id: requestId, senderId: actorId, status: "PENDING" },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });
  if (result.count === 0)
    throw new FriendActionError("Questa richiesta non è più disponibile.");
}

export async function removeFriendship(actorId: string, targetUsername: string) {
  const targetId = await resolveUserId(targetUsername, false);
  await db.friendship.deleteMany({
    where: orderedPair(actorId, targetId),
  });
}

export async function blockUser(actorId: string, targetUsername: string) {
  const targetId = await resolveUserId(targetUsername, false);
  if (actorId === targetId)
    throw new FriendActionError("Non puoi bloccare te stesso.");
  await db.$transaction([
    db.block.upsert({
      where: { blockerId_blockedId: { blockerId: actorId, blockedId: targetId } },
      create: { blockerId: actorId, blockedId: targetId },
      update: {},
    }),
    db.friendship.deleteMany({ where: orderedPair(actorId, targetId) }),
    db.friendRequest.updateMany({
      where: {
        status: "PENDING",
        OR: [
          { senderId: actorId, recipientId: targetId },
          { senderId: targetId, recipientId: actorId },
        ],
      },
      data: { status: "CANCELLED", respondedAt: new Date() },
    }),
  ]);
}

export async function unblockUser(actorId: string, targetUsername: string) {
  const targetId = await resolveUserId(targetUsername, false);
  await db.block.deleteMany({
    where: { blockerId: actorId, blockedId: targetId },
  });
}
