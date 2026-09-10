"use client";
import { useActionState } from "react";
import { resendVerificationEmailAction } from "../actions";
import { initialFormState } from "../schemas";

export function ResendVerificationButton() {
  const [state, action, pending] = useActionState(
    resendVerificationEmailAction,
    initialFormState,
  );
  return (
    <form action={action}>
      <button className="button" disabled={pending}>
        {pending ? "Invio…" : "Invia di nuovo l'email di conferma"}
      </button>
      {state.message && (
        <p
          className={`form-message ${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
