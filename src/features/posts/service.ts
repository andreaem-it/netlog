import "server-only";
import { db } from "@/server/db/client";
import { canReadProfile, orderedPair } from "@/features/profiles/policy";
import { postSchema, commentSchema } from "./schemas";

export class PostActionError extends Error {}

async function canViewPost(
  viewerId: string,
  post: { authorId: string; visibility: "PUBLIC" | "FRIENDS" | "PRIVATE" },
) {
  const owner = post.authorId === viewerId;
  if (owner) return true;
  const [block, friendship] = await Promise.all([
    db.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: post.authorId },
          { blockerId: post.authorId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    }),
    db.friendship.findUnique({
      where: { userLowId_userHighId: orderedPair(viewerId, post.authorId) },
      select: { id: true },
    }),
  ]);
  return canReadProfile({
    owner,
    blocked: Boolean(block),
    friends: Boolean(friendship),
    visibility: post.visibility,
  });
}

export async function createPost(actorId: string, input: unknown) {
  const data = postSchema.parse(input);
  return db.post.create({
    data: { authorId: actorId, body: data.body, visibility: data.visibility },
    select: { id: true },
  });
}

export async function deletePost(actorId: string, postId: string) {
  const result = await db.post.deleteMany({
    where: { id: postId, authorId: actorId },
  });
  if (result.count === 0)
    throw new PostActionError("Questo post non è più disponibile.");
}

export async function toggleLike(actorId: string, postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, visibility: true },
  });
  if (!post || !(await canViewPost(actorId, post)))
    throw new PostActionError("Questo post non è più disponibile.");
  const existing = await db.like.findUnique({
    where: { userId_postId: { userId: actorId, postId } },
    select: { userId: true },
  });
  if (existing) {
    await db.like.delete({
      where: { userId_postId: { userId: actorId, postId } },
    });
    return { liked: false };
  }
  await db.like
    .create({ data: { userId: actorId, postId } })
    .catch(() => {});
  return { liked: true };
}

export async function addComment(actorId: string, postId: string, input: unknown) {
  const data = commentSchema.parse(input);
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, visibility: true },
  });
  if (!post || !(await canViewPost(actorId, post)))
    throw new PostActionError("Questo post non è più disponibile.");
  return db.comment.create({
    data: { postId, authorId: actorId, body: data.body },
    select: { id: true },
  });
}

export async function deleteComment(actorId: string, commentId: string) {
  const result = await db.comment.deleteMany({
    where: { id: commentId, authorId: actorId },
  });
  if (result.count === 0)
    throw new PostActionError("Questo commento non è più disponibile.");
}
