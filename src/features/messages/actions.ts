"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import { db } from "@/server/db/client";
import type { FormState } from "@/features/auth/schemas";
import {
  MessageActionError,
  markConversationRead,
  sendMessage,
  setTyping,
} from "./service";

export async function sendMessageAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const username = String(form.get("username") ?? "");
  try {
    await consumeRateLimit("message-send", actor.id, 120, 3600);
    await sendMessage(actor.id, username, {
      body: form.get("body"),
      clientId: form.get("clientId"),
    });
    revalidatePath(`/messaggi/${username}`);
    revalidatePath("/messaggi");
    return { status: "success" };
  } catch (error) {
    if (error instanceof ZodError)
      return { status: "error", message: error.issues[0]?.message };
    if (error instanceof MessageActionError || error instanceof RateLimitError)
      return { status: "error", message: error.message };
    console.error("message_send_failed");
    return {
      status: "error",
      message: "Non è stato possibile inviare il messaggio.",
    };
  }
}

export async function markConversationReadAction(conversationId: string) {
  const actor = await requireUser();
  await markConversationRead(actor.id, conversationId);
  revalidatePath("/messaggi");
}

// Fire-and-forget presence heartbeat: called periodically while the
// messages section is open (see PresenceHeartbeat). No revalidation needed,
// the polling loop that already refreshes the page will pick up fresh data.
export async function pingPresenceAction() {
  const actor = await requireUser();
  await db.user.update({
    where: { id: actor.id },
    data: { lastSeenAt: new Date() },
  });
}

export async function setTypingAction(conversationId: string) {
  const actor = await requireUser();
  await setTyping(actor.id, conversationId);
}
