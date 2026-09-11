import "server-only";
import { del } from "@vercel/blob";
import { db } from "@/server/db/client";
import { addPhotosSchema, createAlbumSchema, renameAlbumSchema } from "./schemas";

export class AlbumActionError extends Error {}

// Same retry-poll as post images: the upload webhook that flips a
// MediaAsset to READY can lag a moment behind the client's own upload()
// resolving.
async function resolveReadyAssets(ownerId: string, assetIds: string[]) {
  let assets: { id: string }[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    assets = await db.mediaAsset.findMany({
      where: {
        id: { in: assetIds },
        ownerId,
        status: "READY",
        albumPhoto: null,
      },
      select: { id: true },
    });
    if (assets.length === assetIds.length) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (assets.length !== assetIds.length)
    throw new AlbumActionError("Una delle foto non è ancora pronta. Riprova tra qualche secondo.");
  return assets;
}

export async function createAlbum(actorId: string, input: unknown) {
  const data = createAlbumSchema.parse(input);
  await resolveReadyAssets(actorId, data.assetIds);
  return db.album.create({
    data: {
      ownerId: actorId,
      title: data.title,
      photos: {
        create: data.assetIds.map((assetId, position) => ({ assetId, position })),
      },
    },
    select: { id: true },
  });
}

async function requireOwnedAlbum(actorId: string, albumId: string) {
  const album = await db.album.findUnique({
    where: { id: albumId },
    select: { ownerId: true },
  });
  if (!album || album.ownerId !== actorId)
    throw new AlbumActionError("Questo album non è più disponibile.");
  return album;
}

export async function addPhotosToAlbum(actorId: string, albumId: string, input: unknown) {
  await requireOwnedAlbum(actorId, albumId);
  const data = addPhotosSchema.parse(input);
  await resolveReadyAssets(actorId, data.assetIds);
  const lastPosition = await db.albumPhoto.findFirst({
    where: { albumId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const startAt = (lastPosition?.position ?? -1) + 1;
  await db.albumPhoto.createMany({
    data: data.assetIds.map((assetId, index) => ({
      albumId,
      assetId,
      position: startAt + index,
    })),
  });
}

export async function renameAlbum(actorId: string, albumId: string, input: unknown) {
  await requireOwnedAlbum(actorId, albumId);
  const data = renameAlbumSchema.parse(input);
  await db.album.update({ where: { id: albumId }, data: { title: data.title } });
}

export async function deletePhoto(actorId: string, albumId: string, photoId: string) {
  await requireOwnedAlbum(actorId, albumId);
  const photo = await db.albumPhoto.findUnique({
    where: { id: photoId },
    select: { albumId: true, asset: { select: { id: true, storageKey: true } } },
  });
  if (!photo || photo.albumId !== albumId)
    throw new AlbumActionError("Questa foto non è più disponibile.");
  // Deleting the MediaAsset cascades the AlbumPhoto row too.
  await db.mediaAsset.delete({ where: { id: photo.asset.id } });
  await del(photo.asset.storageKey).catch(() => {});
}

export async function deleteAlbum(actorId: string, albumId: string) {
  const assets = await db.albumPhoto.findMany({
    where: { albumId, album: { ownerId: actorId } },
    select: { asset: { select: { id: true, storageKey: true } } },
  });
  const result = await db.album.deleteMany({ where: { id: albumId, ownerId: actorId } });
  if (result.count === 0)
    throw new AlbumActionError("Questo album non è più disponibile.");
  if (assets.length > 0) {
    await db.mediaAsset.deleteMany({
      where: { id: { in: assets.map((a) => a.asset.id) } },
    });
    await Promise.all(assets.map((a) => del(a.asset.storageKey).catch(() => {})));
  }
}
