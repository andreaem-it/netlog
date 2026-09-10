"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import type { FormState } from "@/features/auth/schemas";
import {
  FriendActionError,
  blockUser,
  cancelFriendRequest,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
  unblockUser,
} from "./service";

function errorState(error: unknown): FormState {
  if (error instanceof FriendActionError || error instanceof RateLimitError)
    return { status: "error", message: error.message };
  console.error("friend_action_failed");
  return {
    status: "error",
    message: "Non è stato possibile completare l'operazione. Riprova tra poco.",
  };
}

export async function sendFriendRequestAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const username = String(form.get("username") ?? "");
  try {
    await consumeRateLimit("friend-request", actor.id, 30, 3600);
    const result = await sendFriendRequest(actor.id, username);
    revalidatePath(`/u/${username}`);
    revalidatePath("/amici");
    return {
      status: "success",
      message:
        result.status === "friends"
          ? "Ora siete amici."
          : "Richiesta di amicizia inviata.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function respondToFriendRequestAction(form: FormData) {
  const actor = await requireUser();
  const requestId = String(form.get("requestId") ?? "");
  const accept = form.get("accept") === "true";
  await consumeRateLimit("friend-response", actor.id, 60, 3600);
  await respondToFriendRequest(actor.id, requestId, accept).catch(() => {
    // The request may have been withdrawn or already answered; nothing to do.
  });
  revalidatePath("/amici");
}

export async function cancelFriendRequestAction(form: FormData) {
  const actor = await requireUser();
  const requestId = String(form.get("requestId") ?? "");
  await cancelFriendRequest(actor.id, requestId).catch(() => {});
  revalidatePath("/amici");
}

export async function removeFriendshipAction(form: FormData) {
  const actor = await requireUser();
  const username = String(form.get("username") ?? "");
  await removeFriendship(actor.id, username);
  revalidatePath(`/u/${username}`);
  revalidatePath("/amici");
}

export async function blockUserAction(form: FormData) {
  const actor = await requireUser();
  const username = String(form.get("username") ?? "");
  await consumeRateLimit("block-user", actor.id, 30, 3600);
  await blockUser(actor.id, username);
  // Blocking hides the profile from both sides, so redirect away from it
  // instead of back to /u/[username] (which would now 404 for the actor).
  revalidatePath("/amici");
  redirect("/amici");
}

export async function unblockUserAction(form: FormData) {
  const actor = await requireUser();
  const username = String(form.get("username") ?? "");
  await unblockUser(actor.id, username);
  revalidatePath("/amici");
}
