import "server-only";
import { db } from "@/server/db/client";
import { orderedPair } from "@/features/profiles/policy";
import { canViewPost } from "@/features/posts/service";

const BLOG_PAGE_SIZE = 20;

export async function listOwnBlogPosts(userId: string) {
  const posts = await db.blogPost.findMany({
    where: { authorId: userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, title: true, visibility: true, createdAt: true },
  });
  return posts;
}

// Same visibility/block rules as short posts: one block/friendship lookup
// against the author (not per-post, every post here shares the same
// author), then filter in the WHERE clause so cursor pagination stays exact.
export async function listVisibleBlogPosts(
  viewerId: string,
  ownerUsername: string,
  cursor?: string,
) {
  const owner = await db.user.findFirst({
    where: { profile: { username: ownerUsername }, status: "ACTIVE" },
    select: { id: true },
  });
  if (!owner) return { posts: [], nextCursor: null };
  if (owner.id !== viewerId) {
    const block = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: owner.id },
          { blockerId: owner.id, blockedId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (block) return { posts: [], nextCursor: null };
  }
  const isOwner = owner.id === viewerId;
  const friends = isOwner
    ? false
    : Boolean(
        await db.friendship.findUnique({
          where: { userLowId_userHighId: orderedPair(viewerId, owner.id) },
          select: { id: true },
        }),
      );
  const rows = await db.blogPost.findMany({
    where: {
      authorId: owner.id,
      ...(isOwner
        ? {}
        : {
            visibility: friends ? { in: ["PUBLIC", "FRIENDS"] } : "PUBLIC",
          }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: BLOG_PAGE_SIZE + 1,
    select: { id: true, title: true, visibility: true, createdAt: true },
  });
  const hasMore = rows.length > BLOG_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, BLOG_PAGE_SIZE) : rows;
  return {
    posts: page,
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

export async function getBlogPost(viewerId: string | undefined, postId: string) {
  const post = await db.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      body: true,
      visibility: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { name: true, profile: { select: { username: true } } },
      },
    },
  });
  if (!post || !post.author.profile) return null;
  const owner = post.authorId === viewerId;
  const visible = owner
    ? true
    : viewerId
      ? await canViewPost(viewerId, post)
      : post.visibility === "PUBLIC";
  if (!visible) return null;
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    visibility: post.visibility,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    authorName: post.author.name,
    authorUsername: post.author.profile.username,
    owner,
  };
}
