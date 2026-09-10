import "server-only";
import { db } from "@/server/db/client";
import { createNotification } from "@/features/notifications/service";

// ponytail: rolling dedupe window, not a hard cap — a viewer only registers
// one visit per profile per day, however many times they actually look.
const VISIT_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function recordProfileView(viewerId: string, profileUsername: string) {
  const profile = await db.profile.findUnique({
    where: { username: profileUsername },
    select: { id: true, userId: true, recordVisits: true, notifyVisits: true },
  });
  if (!profile || profile.userId === viewerId || !profile.recordVisits) return;
  const profileUserId = profile.userId;
  const recent = await db.profileView.findFirst({
    where: {
      viewerId,
      profileId: profile.id,
      viewedAt: { gte: new Date(Date.now() - VISIT_DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (recent) return;
  const view = await db.profileView.create({
    data: { viewerId, profileId: profile.id },
    select: { id: true },
  });
  if (profile.notifyVisits)
    await createNotification({
      recipientId: profileUserId,
      actorId: viewerId,
      type: "PROFILE_VIEW",
      profileViewId: view.id,
    });
}
