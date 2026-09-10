"use server";

import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { RateLimitError } from "@/server/security/rate-limit";
import { reportPost, reportProfile, ReportActionError } from "./service";
import type { FormState } from "@/features/auth/schemas";

function errorState(error: unknown): FormState {
  if (error instanceof ReportActionError || error instanceof RateLimitError)
    return { status: "error", message: error.message };
  if (error instanceof ZodError)
    return { status: "error", message: "Controlla i dati inseriti." };
  console.error("report_action_failed");
  return {
    status: "error",
    message: "Il servizio non è disponibile. Riprova tra poco.",
  };
}

export async function reportPostAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();
  try {
    await reportPost(user.id, Object.fromEntries(form));
  } catch (error) {
    return errorState(error);
  }
  return {
    status: "success",
    message: "Segnalazione inviata. Grazie per la tua attenzione.",
  };
}

export async function reportProfileAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();
  try {
    await reportProfile(user.id, Object.fromEntries(form));
  } catch (error) {
    return errorState(error);
  }
  return {
    status: "success",
    message: "Segnalazione inviata. Grazie per la tua attenzione.",
  };
}
