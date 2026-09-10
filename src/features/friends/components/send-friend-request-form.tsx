"use client";
import { useActionState } from "react";
import { sendFriendRequestAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function SendFriendRequestForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(
    sendFriendRequestAction,
    initialFormState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="username" value={username} />
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Invio…" : "Aggiungi amico"}
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
