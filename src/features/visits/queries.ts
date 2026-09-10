import "server-only";
import { db } from "@/server/db/client";

// Matches the retention window purged by `pnpm db:cleanup`.
const VISITORS_WINDOW_DAYS = 30;

export async function listVisitors(ownerUserId: string) {
  const profile = await db.profile.findUnique({
    where: { userId: ownerUserId },
    select: { id: true, showVisitors: true },
  });
  if (!profile || !profile.showVisitors) return [];
  const since = new Date(Date.now() - VISITORS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const views = await db.profileView.findMany({
    where: { profileId: profile.id, viewedAt: { gte: since } },
    orderBy: { viewedAt: "desc" },
    distinct: ["viewerId"],
    take: 50,
    select: {
      viewedAt: true,
      viewer: {
        select: { name: true, profile: { select: { username: true } } },
      },
    },
  });
  return views.map((view) => ({
    name: view.viewer.name,
    username: view.viewer.profile?.username ?? "",
    viewedAt: view.viewedAt,
  }));
}
