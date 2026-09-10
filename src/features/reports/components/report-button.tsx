"use client";
import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { reportPostAction, reportProfileAction } from "../actions";
import { REPORT_REASON_LABEL } from "../schemas";
import { initialFormState } from "@/features/auth/schemas";

export function ReportButton(
  props: { target: "post"; postId: string } | { target: "profile"; username: string },
) {
  const action = props.target === "post" ? reportPostAction : reportProfileAction;
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [open, setOpen] = useState(false);

  if (state.status === "success")
    return (
      <p className="form-message success" role="status">
        {state.message}
      </p>
    );

  if (!open)
    return (
      <button
        type="button"
        className="button button-subtle"
        aria-label="Segnala"
        onClick={() => setOpen(true)}
      >
        <Flag size={14} />
      </button>
    );

  return (
    <form
      action={formAction}
      className="form-stack"
      style={{ flexBasis: "100%" }}
    >
      {props.target === "post" ? (
        <input type="hidden" name="postId" value={props.postId} />
      ) : (
        <input type="hidden" name="username" value={props.username} />
      )}
      <label>
        Motivo della segnalazione
        <select name="reason" defaultValue="SPAM">
          {Object.entries(REPORT_REASON_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dettagli (facoltativo)
        <textarea name="detail" maxLength={500} />
      </label>
      {state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annulla
        </button>
        <button type="submit" className="button button-danger" disabled={pending}>
          {pending ? "Invio…" : "Invia segnalazione"}
        </button>
      </div>
    </form>
  );
}
