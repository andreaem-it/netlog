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
