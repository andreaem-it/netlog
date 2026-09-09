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
          visibility: data.visibility,
        },
      },
    },
    select: { profile: { select: { username: true } } },
  });
}
