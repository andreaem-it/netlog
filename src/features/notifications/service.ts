import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/server/db/client";

export async function createNotification(input: {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  friendRequestId?: string;
  postId?: string;
  commentId?: string;
  profileViewId?: string;
  dedupeKey?: string;
}) {
  if (input.recipientId === input.actorId) return;
  await db.notification.create({ data: input }).catch((error) => {
    // dedupeKey unique violation: this exact notification already exists.
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    )
      throw error;
  });
}

export async function markAllNotificationsRead(userId: string) {
  await db.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}
