import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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
