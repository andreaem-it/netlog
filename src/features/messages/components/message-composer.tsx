"use client";
import { useActionState, useState } from "react";
import { sendMessageAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function MessageComposer({ username }: { username: string }) {
  const [state, action, pending] = useActionState(
    sendMessageAction,
    initialFormState,
  );
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") {
      setBody("");
      setClientId(crypto.randomUUID());
    }
  }
  return (
    <form action={action} className="button-row">
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="body"
        placeholder="Scrivi un messaggio…"
        maxLength={5000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
      />
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Invio…" : "Invia"}
      </button>
      {state.status === "error" && state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
