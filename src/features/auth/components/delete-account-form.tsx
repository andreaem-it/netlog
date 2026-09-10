"use client";
import { useActionState, useState } from "react";
import { deleteAccountAction } from "../actions";
import { initialFormState } from "../schemas";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    initialFormState,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming)
    return (
      <button
        type="button"
        className="button button-danger"
        onClick={() => setConfirming(true)}
      >
        Elimina il tuo account
      </button>
    );

  return (
    <form action={action} className="form-stack">
      <label>
        Conferma la password per eliminare l&apos;account
        <input name="password" type="password" required maxLength={128} />
      </label>
      <p className="field-hint">
        L&apos;azione è irreversibile: profilo, foto e dati personali
        verranno rimossi. I messaggi e i post restano visibili alle persone
        con cui li hai condivisi, ma non saranno più collegati a te.
      </p>
      {state.message && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Annulla
        </button>
        <button type="submit" className="button button-danger" disabled={pending}>
          {pending ? "Eliminazione…" : "Elimina definitivamente"}
        </button>
      </div>
    </form>
  );
}
