"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import type { FormState } from "@/features/auth/schemas";
import {
  PostActionError,
  addComment,
  createPost,
  deleteComment,
  deletePost,
  toggleLike,
} from "./service";

function errorState(error: unknown): FormState {
  if (error instanceof ZodError)
    return { status: "error", message: error.issues[0]?.message };
  if (error instanceof PostActionError || error instanceof RateLimitError)
    return { status: "error", message: error.message };
  console.error("post_action_failed");
  return {
    status: "error",
    message: "Non è stato possibile completare l'operazione. Riprova tra poco.",
  };
}

export async function createPostAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  try {
    await consumeRateLimit("post-create", actor.id, 30, 3600);
    await createPost(actor.id, Object.fromEntries(form));
    revalidatePath("/home");
    return { status: "success", message: "Post pubblicato." };
  } catch (error) {
    return errorState(error);
  }
}

export async function deletePostAction(form: FormData) {
  const actor = await requireUser();
  const postId = String(form.get("postId") ?? "");
  await deletePost(actor.id, postId).catch(() => {});
  revalidatePath("/home");
}

export async function toggleLikeAction(form: FormData) {
  const actor = await requireUser();
  const postId = String(form.get("postId") ?? "");
  await consumeRateLimit("post-like", actor.id, 120, 3600);
  await toggleLike(actor.id, postId).catch(() => {});
  revalidatePath("/home");
}

export async function addCommentAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const postId = String(form.get("postId") ?? "");
  try {
    await consumeRateLimit("comment-create", actor.id, 60, 3600);
    await addComment(actor.id, postId, { body: form.get("body") });
    revalidatePath("/home");
    return { status: "success" };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteCommentAction(form: FormData) {
  const actor = await requireUser();
  const commentId = String(form.get("commentId") ?? "");
  await deleteComment(actor.id, commentId).catch(() => {});
  revalidatePath("/home");
}
