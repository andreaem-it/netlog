import "server-only";
import { db } from "@/server/db/client";
import { editProfileSchema } from "@/features/auth/schemas";

export async function updateOwnProfile(actor: { id: string }, input: unknown) {
  const data = editProfileSchema.parse(input);
  // No target user ID from the form. The authenticated actor owns the write.
  return db.user.update({
    where: { id: actor.id, status: "ACTIVE" },
    data: {
      name: data.name,
      profile: {
        update: {
          bio: data.bio,
          city: data.city || null,
          birthDate: data.birthDate ?? null,
          visibility: data.visibility,
          messagePermission: data.messagePermission,
          recordVisits: data.recordVisits,
          showVisitors: data.showVisitors,
          notifyVisits: data.notifyVisits,
        },
      },
    },
    select: { profile: { select: { username: true } } },
  });
}

// Creates the MediaAsset row and points the profile's avatar/cover at it.
// Deleting the previous asset's blob file is the caller's job (it owns the
// storage client); this only returns its id so the caller can clean it up.
export async function applyProfileMedia(input: {
  userId: string;
  kind: "avatar" | "cover";
  storageKey: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}) {
  const asset = await db.mediaAsset.create({
    data: {
      ownerId: input.userId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      size: input.size,
      width: input.width,
      height: input.height,
      status: "READY",
    },
  });
  const field = input.kind === "avatar" ? "avatarId" : "coverId";
  const previous = await db.profile.findUnique({
    where: { userId: input.userId },
    select: { avatarId: true, coverId: true },
  });
  await db.profile.update({
    where: { userId: input.userId },
    data: { [field]: asset.id },
  });
  const previousId =
    input.kind === "avatar" ? previous?.avatarId : previous?.coverId;
  return { assetId: asset.id, previousAssetId: previousId ?? null };
}
