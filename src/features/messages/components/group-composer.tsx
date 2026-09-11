"use client";
import { useActionState } from "react";
import { createGroupAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function GroupComposer({
  friends,
}: {
  friends: { username: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createGroupAction, initialFormState);
  return (
    <form action={action} className="form-stack">
      <label>
        Nome del gruppo
        <input name="name" maxLength={80} placeholder="Es. Weekend in montagna" required />
      </label>
      <div>
        <p className="field-hint" style={{ marginBottom: 8 }}>
          Scegli almeno 2 amici da aggiungere al gruppo.
        </p>
        <div className="stack" style={{ gap: 8 }}>
          {friends.map((friend) => (
            <label key={friend.username}>
              <input type="checkbox" name="members" value={friend.username} />
              {friend.name}
            </label>
          ))}
        </div>
      </div>
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Creazione…" : "Crea gruppo"}
      </button>
      {state.status === "error" && state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
