"use client";
import { useActionState, useState } from "react";
import { createAlbumAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";
import { AlbumImagePicker } from "./album-image-picker";

export function CreateAlbumForm() {
  const [state, action, pending] = useActionState(createAlbumAction, initialFormState);
  const [photosPending, setPhotosPending] = useState(false);
  return (
    <form action={action} className="form-stack">
      <label>
        Titolo dell&apos;album
        <input name="title" maxLength={80} placeholder="Es. Vacanze 2026" required />
      </label>
      <AlbumImagePicker disabled={pending} onPendingChange={setPhotosPending} />
      <button className="button button-primary" disabled={pending || photosPending} type="submit">
        {pending ? "Creazione…" : "Crea album"}
      </button>
      {state.status === "error" && state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
