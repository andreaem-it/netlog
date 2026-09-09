"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import type { FormState } from "@/features/auth/schemas";
import { updateOwnProfile } from "./service";

export async function updateProfileAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  try {
    await consumeRateLimit("profile-edit", actor.id, 30, 900);
    const result = await updateOwnProfile(actor, Object.fromEntries(form));
    if (result.profile) revalidatePath(`/u/${result.profile.username}`);
    revalidatePath("/home");
    revalidatePath("/settings");
    return { status: "success", message: "Il tuo profilo è stato aggiornato." };
  } catch (error) {
    if (error instanceof ZodError)
      return { status: "error", message: error.issues[0]?.message };
    if (error instanceof RateLimitError)
      return { status: "error", message: error.message };
    console.error("profile_update_failed");
    return {
      status: "error",
      message: "Non è stato possibile salvare le modifiche.",
    };
  }
}
