import "server-only";
import { db } from "@/server/db/client";
import { canReadProfile, orderedPair } from "@/features/profiles/policy";

export async function listOwnAlbums(userId: string) {
  const albums = await db.album.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      photos: {
        orderBy: { position: "asc" },
        take: 1,
        select: { asset: { select: { storageKey: true } } },
      },
      _count: { select: { photos: true } },
    },
  });
  return albums.map((album) => ({
    id: album.id,
    title: album.title,
    createdAt: album.createdAt,
    photoCount: album._count.photos,
    coverUrl: album.photos[0]?.asset.storageKey ?? null,
  }));
}

// Albums are visible to the same audience as the owner's profile (same
// visibility/block/friends check used to view the profile itself) — no
// separate per-album visibility setting.
export async function listVisibleAlbums(ownerUsername: string, viewerId?: string) {
  const profile = await db.profile.findUnique({
    where: { username: ownerUsername },
    select: { userId: true, visibility: true, user: { select: { status: true } } },
  });
  if (!profile || profile.user.status !== "ACTIVE") return null;
  const owner = profile.userId === viewerId;
  let blocked = false;
  let friends = false;
  if (viewerId && !owner) {
    const [block, friendship] = await Promise.all([
      db.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: profile.userId },
            { blockerId: profile.userId, blockedId: viewerId },
          ],
        },
        select: { id: true },
      }),
      db.friendship.findUnique({
        where: { userLowId_userHighId: orderedPair(viewerId, profile.userId) },
        select: { id: true },
      }),
    ]);
    blocked = Boolean(block);
    friends = Boolean(friendship);
  }
  if (!canReadProfile({ owner, blocked, friends, visibility: profile.visibility }))
    return null;
  return listOwnAlbums(profile.userId);
}

export async function getAlbum(viewerId: string | undefined, albumId: string) {
  const album = await db.album.findUnique({
    where: { id: albumId },
    select: {
      id: true,
      title: true,
      ownerId: true,
      owner: {
        select: {
          name: true,
          profile: { select: { username: true, visibility: true } },
        },
      },
      photos: {
        orderBy: { position: "asc" },
        select: { id: true, asset: { select: { storageKey: true } } },
      },
    },
  });
  if (!album || !album.owner.profile) return null;
  const owner = album.ownerId === viewerId;
  let blocked = false;
  let friends = false;
  if (viewerId && !owner) {
    const [block, friendship] = await Promise.all([
      db.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: album.ownerId },
            { blockerId: album.ownerId, blockedId: viewerId },
          ],
        },
        select: { id: true },
      }),
      db.friendship.findUnique({
        where: { userLowId_userHighId: orderedPair(viewerId, album.ownerId) },
        select: { id: true },
      }),
    ]);
    blocked = Boolean(block);
    friends = Boolean(friendship);
  }
  if (
    !canReadProfile({
      owner,
      blocked,
      friends,
      visibility: album.owner.profile.visibility,
    })
  )
    return null;
  return {
    id: album.id,
    title: album.title,
    ownerUsername: album.owner.profile.username,
    ownerName: album.owner.name,
    owner,
    photos: album.photos.map((p) => ({ id: p.id, url: p.asset.storageKey })),
  };
}
