"use client";
import { useActionState, useRef, useState } from "react";
import { sendGroupMessageAction, setTypingAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

const TYPING_PING_INTERVAL_MS = 4000;

export function GroupMessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(
    sendGroupMessageAction,
    initialFormState,
  );
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [lastState, setLastState] = useState(state);
  const lastTypingPingAt = useRef(0);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") {
      setBody("");
      setClientId(crypto.randomUUID());
    }
  }
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setBody(event.target.value);
    const now = Date.now();
    if (now - lastTypingPingAt.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingAt.current = now;
    setTypingAction(conversationId);
  }
  return (
    <form action={action} className="button-row">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="body"
        placeholder="Scrivi un messaggio…"
        maxLength={5000}
        value={body}
        onChange={handleChange}
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
