import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { canViewPost } from "@/features/posts/service";
import { reportPostSchema, reportProfileSchema } from "./schemas";

export class ReportActionError extends Error {}

export async function reportPost(reporterId: string, input: unknown) {
  const data = reportPostSchema.parse(input);
  await consumeRateLimit("report", reporterId, 20, 3600);
  const post = await db.post.findUnique({
    where: { id: data.postId },
    select: { authorId: true, visibility: true },
  });
  if (!post || !(await canViewPost(reporterId, post)))
    throw new ReportActionError("Questo post non è più disponibile.");
  if (post.authorId === reporterId)
    throw new ReportActionError("Non puoi segnalare un tuo post.");
  try {
    await db.report.create({
      data: {
        reporterId,
        postId: data.postId,
        reason: data.reason,
        detail: data.detail,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReportActionError("Hai già segnalato questo post.");
    }
    throw error;
  }
}

export async function reportProfile(reporterId: string, input: unknown) {
  const data = reportProfileSchema.parse(input);
  await consumeRateLimit("report", reporterId, 20, 3600);
  const target = await db.user.findFirst({
    where: { profile: { username: data.username }, status: "ACTIVE" },
    select: { id: true },
  });
  if (!target) throw new ReportActionError("Utente non trovato.");
  if (target.id === reporterId)
    throw new ReportActionError("Non puoi segnalare il tuo profilo.");
  try {
    await db.report.create({
      data: {
        reporterId,
        reportedUserId: target.id,
        reason: data.reason,
        detail: data.detail,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReportActionError("Hai già segnalato questo profilo.");
    }
    throw error;
  }
}

// Admin-only moderation actions. Callers must gate access with
// requireAdmin() before reaching here — these bypass every ownership check.
export async function resolveReport(reportId: string) {
  const result = await db.report.updateMany({
    where: { id: reportId, status: "OPEN" },
    data: { status: "RESOLVED" },
  });
  if (result.count === 0)
    throw new ReportActionError("Segnalazione non trovata o già risolta.");
}

export async function moderationDeletePost(postId: string) {
  const result = await db.post.deleteMany({ where: { id: postId } });
  if (result.count === 0)
    throw new ReportActionError("Post non trovato.");
  await db.report.updateMany({
    where: { postId, status: "OPEN" },
    data: { status: "RESOLVED" },
  });
}

export async function moderationSuspendUser(userId: string) {
  const result = await db.user.updateMany({
    where: { id: userId, status: "ACTIVE" },
    data: { status: "SUSPENDED", sessionVersion: { increment: 1 } },
  });
  if (result.count === 0)
    throw new ReportActionError("Utente non trovato o già sospeso.");
  await db.report.updateMany({
    where: { reportedUserId: userId, status: "OPEN" },
    data: { status: "RESOLVED" },
  });
}
