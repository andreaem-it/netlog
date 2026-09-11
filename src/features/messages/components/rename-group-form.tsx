"use client";
import { useActionState } from "react";
import { renameGroupAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function RenameGroupForm({
  conversationId,
  currentName,
}: {
  conversationId: string;
  currentName: string;
}) {
  const [state, action, pending] = useActionState(renameGroupAction, initialFormState);
  return (
    <form action={action} className="button-row">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input name="name" defaultValue={currentName} maxLength={80} required />
      <button className="button" disabled={pending} type="submit">
        {pending ? "Salvataggio…" : "Rinomina"}
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
