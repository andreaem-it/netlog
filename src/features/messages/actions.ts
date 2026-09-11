"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import { db } from "@/server/db/client";
import type { FormState } from "@/features/auth/schemas";
import {
  MessageActionError,
  addGroupMembers,
  createGroupConversation,
  leaveGroupConversation,
  markConversationRead,
  removeGroupMember,
  renameGroupConversation,
  sendGroupMessage,
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

export async function sendGroupMessageAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const conversationId = String(form.get("conversationId") ?? "");
  try {
    await consumeRateLimit("message-send", actor.id, 120, 3600);
    await sendGroupMessage(actor.id, conversationId, {
      body: form.get("body"),
      clientId: form.get("clientId"),
    });
    revalidatePath(`/messaggi/gruppo/${conversationId}`);
    revalidatePath("/messaggi");
    return { status: "success" };
  } catch (error) {
    if (error instanceof ZodError)
      return { status: "error", message: error.issues[0]?.message };
    if (error instanceof MessageActionError || error instanceof RateLimitError)
      return { status: "error", message: error.message };
    console.error("group_message_send_failed");
    return {
      status: "error",
      message: "Non è stato possibile inviare il messaggio.",
    };
  }
}

export async function createGroupAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  let conversation: { id: string };
  try {
    await consumeRateLimit("group-create", actor.id, 20, 3600);
    conversation = await createGroupConversation(actor.id, {
      name: form.get("name"),
      memberUsernames: form.getAll("members"),
    });
  } catch (error) {
    if (error instanceof ZodError)
      return { status: "error", message: error.issues[0]?.message };
    if (error instanceof MessageActionError || error instanceof RateLimitError)
      return { status: "error", message: error.message };
    console.error("group_create_failed");
    return {
      status: "error",
      message: "Non è stato possibile creare il gruppo.",
    };
  }
  revalidatePath("/messaggi");
  redirect(`/messaggi/gruppo/${conversation.id}`);
}

export async function leaveGroupAction(conversationId: string) {
  const actor = await requireUser();
  await leaveGroupConversation(actor.id, conversationId).catch(() => {});
  revalidatePath("/messaggi");
  redirect("/messaggi");
}

export async function renameGroupAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const conversationId = String(form.get("conversationId") ?? "");
  try {
    await renameGroupConversation(actor.id, conversationId, {
      name: form.get("name"),
    });
    revalidatePath(`/messaggi/gruppo/${conversationId}`);
    revalidatePath("/messaggi");
    return { status: "success", message: "Nome del gruppo aggiornato." };
  } catch (error) {
    if (error instanceof ZodError)
      return { status: "error", message: error.issues[0]?.message };
    if (error instanceof MessageActionError)
      return { status: "error", message: error.message };
    console.error("group_rename_failed");
    return { status: "error", message: "Non è stato possibile rinominare il gruppo." };
  }
}

export async function addGroupMembersAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const conversationId = String(form.get("conversationId") ?? "");
  try {
    await addGroupMembers(actor.id, conversationId, {
      memberUsernames: form.getAll("members"),
    });
    revalidatePath(`/messaggi/gruppo/${conversationId}`);
    return { status: "success", message: "Persone aggiunte al gruppo." };
  } catch (error) {
    if (error instanceof ZodError)
      return { status: "error", message: error.issues[0]?.message };
    if (error instanceof MessageActionError)
      return { status: "error", message: error.message };
    console.error("group_add_members_failed");
    return { status: "error", message: "Non è stato possibile aggiungere le persone." };
  }
}

export async function removeGroupMemberAction(
  conversationId: string,
  targetUserId: string,
) {
  const actor = await requireUser();
  await removeGroupMember(actor.id, conversationId, targetUserId).catch(() => {});
  revalidatePath(`/messaggi/gruppo/${conversationId}`);
}
