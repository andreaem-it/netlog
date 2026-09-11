"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import type { FormState } from "@/features/auth/schemas";
import { BlogActionError, createBlogPost, deleteBlogPost, updateBlogPost } from "./service";

function errorState(error: unknown): FormState {
  if (error instanceof ZodError)
    return { status: "error", message: error.issues[0]?.message };
  if (error instanceof BlogActionError || error instanceof RateLimitError)
    return { status: "error", message: error.message };
  console.error("blog_action_failed");
  return {
    status: "error",
    message: "Non è stato possibile completare l'operazione. Riprova tra poco.",
  };
}

export async function createBlogPostAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  let post: { id: string };
  try {
    await consumeRateLimit("blog-post-create", actor.id, 20, 3600);
    post = await createBlogPost(actor.id, {
      title: form.get("title"),
      body: form.get("body"),
      visibility: form.get("visibility"),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/blog");
  redirect(`/blog/${post.id}`);
}

export async function updateBlogPostAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const postId = String(form.get("postId") ?? "");
  try {
    await updateBlogPost(actor.id, postId, {
      title: form.get("title"),
      body: form.get("body"),
      visibility: form.get("visibility"),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/blog/${postId}`);
  revalidatePath("/blog");
  return { status: "success", message: "Post aggiornato." };
}

export async function deleteBlogPostAction(postId: string) {
  const actor = await requireUser();
  await deleteBlogPost(actor.id, postId).catch(() => {});
  revalidatePath("/blog");
  redirect("/blog");
}
