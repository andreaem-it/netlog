import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { sendPushToUser } from "@/features/push/service";
import { notificationText } from "./copy";

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
  const created = await db.notification
    .create({ data: input, select: { id: true } })
    .catch((error) => {
      // dedupeKey unique violation: this exact notification already exists.
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
      )
        throw error;
      return null;
    });
  if (!created) return;
  const actor = input.actorId
    ? await db.user.findUnique({
        where: { id: input.actorId },
        select: { name: true, profile: { select: { username: true } } },
      })
    : null;
  await sendPushToUser(input.recipientId, {
    title: "Netlog",
    body: notificationText(input.type, actor?.name ?? "Qualcuno"),
    url: input.type === "MESSAGE" ? "/messaggi" : actor?.profile?.username ? `/u/${actor.profile.username}` : "/notifiche",
  }).catch(() => {});
}

export async function markAllNotificationsRead(userId: string) {
  await db.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}
