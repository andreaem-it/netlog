"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { ZodError } from "zod";
import { signIn, signOut } from "@/auth";
import { clientIdentity, RateLimitError } from "@/server/security/rate-limit";
import {
  AccountInputError,
  registerAccount,
  requestPasswordReset,
  resetPassword,
} from "./service";
import { loginSchema, type FormState } from "./schemas";

function errorState(error: unknown): FormState {
  if (error instanceof ZodError)
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Controlla i dati inseriti.",
    };
  if (error instanceof AccountInputError || error instanceof RateLimitError)
    return { status: "error", message: error.message };
  console.error("account_action_failed");
  return {
    status: "error",
    message: "Il servizio non è disponibile. Riprova tra poco.",
  };
}

export async function registerAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await registerAccount(
      Object.fromEntries(form),
      clientIdentity(await headers()),
    );
  } catch (error) {
    return errorState(error);
  }
  redirect("/login?registered=1");
}

export async function loginAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { status: "error", message: "Controlla email e password." };
  try {
    const result = await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });
    if (result?.error) {
      return {
        status: "error",
        message:
          "Accesso non riuscito. Controlla email e password o attendi qualche minuto prima di riprovare.",
      };
    }
  } catch (error) {
    if (error instanceof AuthError)
      return {
        status: "error",
        message:
          "Accesso non riuscito. Controlla i dati o attendi qualche minuto prima di riprovare.",
      };
    return errorState(error);
  }
  redirect("/home");
}

export async function forgotPasswordAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await requestPasswordReset(
      form.get("email"),
      clientIdentity(await headers()),
    );
  } catch (error) {
    if (!(error instanceof RateLimitError)) return errorState(error);
    // Same response for throttled email addresses and unknown accounts.
  }
  return {
    status: "success",
    message:
      "Se esiste un account con questa email, riceverai un link per scegliere una nuova password.",
  };
}

export async function resetPasswordAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await resetPassword(
      Object.fromEntries(form),
      clientIdentity(await headers()),
    );
  } catch (error) {
    return errorState(error);
  }
  redirect("/login?reset=1");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
