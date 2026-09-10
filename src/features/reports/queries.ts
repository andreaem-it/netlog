import "server-only";
import { db } from "@/server/db/client";

export async function listOpenReports() {
  const reports = await db.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      detail: true,
      createdAt: true,
      reporter: { select: { name: true, profile: { select: { username: true } } } },
      post: {
        select: {
          id: true,
          body: true,
          author: {
            select: { name: true, profile: { select: { username: true } } },
          },
        },
      },
      reportedUser: {
        select: { id: true, name: true, profile: { select: { username: true } } },
      },
    },
  });
  return reports.map((report) => ({
    id: report.id,
    reason: report.reason,
    detail: report.detail,
    createdAt: report.createdAt,
    reporterName: report.reporter.name,
    reporterUsername: report.reporter.profile?.username ?? "",
    post: report.post
      ? {
          id: report.post.id,
          body: report.post.body,
          authorName: report.post.author.name,
          authorUsername: report.post.author.profile?.username ?? "",
        }
      : null,
    reportedUser: report.reportedUser
      ? {
          id: report.reportedUser.id,
          name: report.reportedUser.name,
          username: report.reportedUser.profile?.username ?? "",
        }
      : null,
  }));
}
