"use client";
import { useActionState, useState } from "react";
import { createPostAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";
import { PostImagePicker } from "./post-image-picker";

export function PostComposer() {
  const [state, action, pending] = useActionState(
    createPostAction,
    initialFormState,
  );
  const [body, setBody] = useState("");
  const [imagesPending, setImagesPending] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  // Clear the draft once the action reports success. Derived during render
  // (not in an effect) per React's guidance for resetting state on change.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") {
      setBody("");
      setPickerKey((key) => key + 1);
    }
  }
  return (
    <form action={action} className="form-stack">
      <label>
        Condividi qualcosa
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
          placeholder="A cosa stai pensando?"
        />
      </label>
      <PostImagePicker key={pickerKey} disabled={pending} onPendingChange={setImagesPending} />
      <div className="button-row">
        <select name="visibility" defaultValue="FRIENDS">
          <option value="FRIENDS">Solo amici</option>
          <option value="PUBLIC">Tutti</option>
          <option value="PRIVATE">Solo io</option>
        </select>
        <button className="button button-primary" disabled={pending || imagesPending}>
          {pending ? "Pubblicazione…" : "Pubblica"}
        </button>
      </div>
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
