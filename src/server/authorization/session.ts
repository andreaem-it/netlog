import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAdminEmails } from "@/config/env";
import { validateSession } from "./validate-session";

export const currentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return validateSession(session.user.id, session.sessionVersion);
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  // 404 rather than 403: don't reveal that a moderation area exists.
  if (!getAdminEmails().has(user.email.toLowerCase())) notFound();
  return user;
}
