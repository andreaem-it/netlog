import "server-only";
import { db } from "@/server/db/client";

const FEED_PAGE_SIZE = 20;

export async function getFeed(viewerId: string, cursor?: string) {
  const [friendships, blocks] = await Promise.all([
    db.friendship.findMany({
      where: { OR: [{ userLowId: viewerId }, { userHighId: viewerId }] },
      select: { userLowId: true, userHighId: true },
    }),
    db.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  const friendIds = friendships.map((f) =>
    f.userLowId === viewerId ? f.userHighId : f.userLowId,
  );
  const blockedIds = blocks.map((b) =>
    b.blockerId === viewerId ? b.blockedId : b.blockerId,
  );

  const rows = await db.post.findMany({
    where: {
      author: { status: "ACTIVE" },
      ...(blockedIds.length ? { authorId: { notIn: blockedIds } } : {}),
      OR: [
        { authorId: viewerId },
        { visibility: "PUBLIC" },
        ...(friendIds.length
          ? [{ visibility: "FRIENDS" as const, authorId: { in: friendIds } }]
          : []),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: FEED_PAGE_SIZE + 1,
    select: {
      id: true,
      body: true,
      visibility: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          name: true,
          profile: {
            select: {
              username: true,
              avatar: { select: { storageKey: true } },
            },
          },
        },
      },
      _count: { select: { comments: true, likes: true } },
      likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
      images: {
        orderBy: { position: "asc" },
        select: { asset: { select: { storageKey: true } } },
      },
    },
  });
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  return {
    posts: page.map((post) => ({
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt,
      authorName: post.author.name,
      authorUsername: post.author.profile?.username ?? "",
      authorAvatarUrl: post.author.profile?.avatar?.storageKey ?? null,
      owner: post.authorId === viewerId,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      likedByViewer: post.likes.length > 0,
      imageUrls: post.images.map((image) => image.asset.storageKey),
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

export async function getComments(postId: string) {
  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      body: true,
      createdAt: true,
      authorId: true,
      author: { select: { name: true, profile: { select: { username: true } } } },
    },
  });
  return comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorUsername: comment.author.profile?.username ?? "",
  }));
}
