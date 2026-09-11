"use client";
import { useActionState } from "react";
import { addGroupMembersAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function AddGroupMembersForm({
  conversationId,
  addableFriends,
}: {
  conversationId: string;
  addableFriends: { username: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(
    addGroupMembersAction,
    initialFormState,
  );
  if (addableFriends.length === 0)
    return <p className="muted">Tutti i tuoi amici fanno già parte del gruppo.</p>;
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="stack" style={{ gap: 8 }}>
        {addableFriends.map((friend) => (
          <label key={friend.username}>
            <input type="checkbox" name="members" value={friend.username} />
            {friend.name}
          </label>
        ))}
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Aggiunta…" : "Aggiungi al gruppo"}
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
