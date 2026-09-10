"use client";
import { useActionState } from "react";
import { addCommentAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(
    addCommentAction,
    initialFormState,
  );
  return (
    <form action={action} className="button-row">
      <input type="hidden" name="postId" value={postId} />
      <input
        name="body"
        placeholder="Scrivi un commento…"
        maxLength={2000}
        required
      />
      <button className="button" disabled={pending} type="submit">
        {pending ? "…" : "Commenta"}
      </button>
      {state.status === "error" && state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
