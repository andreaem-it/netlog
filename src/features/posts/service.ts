import "server-only";
import { del } from "@vercel/blob";
import { db } from "@/server/db/client";
import { canReadProfile, orderedPair } from "@/features/profiles/policy";
import { createNotification } from "@/features/notifications/service";
import { postSchema, commentSchema } from "./schemas";

export class PostActionError extends Error {}

export async function canViewPost(
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
  if (data.imageIds.length === 0) {
    return db.post.create({
      data: { authorId: actorId, body: data.body, visibility: data.visibility },
      select: { id: true },
    });
  }
  // The upload webhook that creates each MediaAsset row runs asynchronously
  // and can lag a moment behind the client's own upload() resolving — retry
  // briefly rather than failing a post over a race that usually clears in
  // well under a second.
  let assets: { id: string }[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    assets = await db.mediaAsset.findMany({
      where: {
        id: { in: data.imageIds },
        ownerId: actorId,
        status: "READY",
        postImages: { none: {} },
      },
      select: { id: true },
    });
    if (assets.length === data.imageIds.length) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (assets.length !== data.imageIds.length)
    throw new PostActionError(
      "Una delle immagini non è ancora pronta. Riprova tra qualche secondo.",
    );
  return db.post.create({
    data: {
      authorId: actorId,
      body: data.body,
      visibility: data.visibility,
      images: {
        create: data.imageIds.map((assetId, position) => ({ assetId, position })),
      },
    },
    select: { id: true },
  });
}

export async function deletePost(actorId: string, postId: string) {
  const assets = await db.mediaAsset.findMany({
    where: { postImages: { some: { postId } } },
    select: { id: true, storageKey: true },
  });
  const result = await db.post.deleteMany({
    where: { id: postId, authorId: actorId },
  });
  if (result.count === 0)
    throw new PostActionError("Questo post non è più disponibile.");
  // PostImage rows are already gone (cascaded); the MediaAsset row and its
  // blob file are separate storage and would otherwise be left orphaned.
  if (assets.length > 0) {
    await db.mediaAsset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } });
    await Promise.all(assets.map((a) => del(a.storageKey).catch(() => {})));
  }
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
  await createNotification({
    recipientId: post.authorId,
    actorId,
    type: "POST_LIKE",
    postId,
  });
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
  const comment = await db.comment.create({
    data: { postId, authorId: actorId, body: data.body },
    select: { id: true },
  });
  await createNotification({
    recipientId: post.authorId,
    actorId,
    type: "POST_COMMENT",
    postId,
    commentId: comment.id,
  });
  return comment;
}

export async function deleteComment(actorId: string, commentId: string) {
  const result = await db.comment.deleteMany({
    where: { id: commentId, authorId: actorId },
  });
  if (result.count === 0)
    throw new PostActionError("Questo commento non è più disponibile.");
}
