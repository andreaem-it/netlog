"use client";
import { useActionState } from "react";
import { renameAlbumAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function RenameAlbumForm({
  albumId,
  currentTitle,
}: {
  albumId: string;
  currentTitle: string;
}) {
  const [state, action, pending] = useActionState(renameAlbumAction, initialFormState);
  return (
    <form action={action} className="button-row">
      <input type="hidden" name="albumId" value={albumId} />
      <input name="title" defaultValue={currentTitle} maxLength={80} required />
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
