"use client";
import { useActionState, useState } from "react";
import { addPhotosAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";
import { AlbumImagePicker } from "./album-image-picker";

export function AddPhotosForm({ albumId }: { albumId: string }) {
  const [state, action, pending] = useActionState(addPhotosAction, initialFormState);
  const [photosPending, setPhotosPending] = useState(false);
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="albumId" value={albumId} />
      <AlbumImagePicker disabled={pending} onPendingChange={setPhotosPending} />
      <button className="button" disabled={pending || photosPending} type="submit">
        {pending ? "Aggiunta…" : "Aggiungi foto all'album"}
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
