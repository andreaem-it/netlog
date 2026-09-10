"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/authorization/session";
import { markAllNotificationsRead } from "./service";

export async function markAllNotificationsReadAction() {
  const actor = await requireUser();
  await markAllNotificationsRead(actor.id);
  revalidatePath("/notifiche");
}
