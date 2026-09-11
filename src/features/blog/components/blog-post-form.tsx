"use client";
import { useActionState } from "react";
import type { FormState } from "@/features/auth/schemas";
import { initialFormState } from "@/features/auth/schemas";

export function BlogPostForm({
  action,
  postId,
  initial,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  postId?: string;
  initial?: { title: string; body: string; visibility: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="form-stack">
      {postId && <input type="hidden" name="postId" value={postId} />}
      <label>
        Titolo
        <input name="title" maxLength={120} defaultValue={initial?.title} required />
      </label>
      <label>
        Testo
        <textarea
          name="body"
          maxLength={20000}
          defaultValue={initial?.body}
          placeholder="Racconta con calma…"
          style={{ minHeight: 260 }}
          required
        />
      </label>
      <label>
        Chi può leggerlo?
        <select name="visibility" defaultValue={initial?.visibility ?? "PUBLIC"}>
          <option value="PUBLIC">Tutti</option>
          <option value="FRIENDS">Solo amici</option>
          <option value="PRIVATE">Solo io</option>
        </select>
      </label>
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Salvataggio…" : submitLabel}
      </button>
      {state.status === "error" && state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
