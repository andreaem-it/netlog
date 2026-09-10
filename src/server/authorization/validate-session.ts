import "server-only";
import { db } from "@/server/db/client";

export async function validateSession(
  userId: string,
  version: number | undefined,
) {
  if (version === undefined) return null;
  return db.user.findFirst({
    where: { id: userId, status: "ACTIVE", sessionVersion: version },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: { username: true, avatar: { select: { storageKey: true } } },
      },
    },
  });
}
