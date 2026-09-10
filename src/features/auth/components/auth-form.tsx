"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import {
  registerAction,
  loginAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "../actions";
import { initialFormState } from "../schemas";

type Mode = "login" | "register" | "forgot" | "reset";
const options = {
  login: { action: loginAction, button: "Entra nel tuo spazio" },
  register: { action: registerAction, button: "Crea il tuo profilo" },
  forgot: { action: forgotPasswordAction, button: "Invia il link" },
  reset: { action: resetPasswordAction, button: "Salva la nuova password" },
};

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const [state, action, pending] = useActionState(
    options[mode].action,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack">
      {mode === "register" && (
        <>
          <label>
            Nome visualizzato
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={60}
              placeholder="Come ti chiami?"
            />
          </label>
          <label>
            Username
            <div className="input-prefix">
              <span>@</span>
              <input
                name="username"
                autoComplete="username"
                required
                maxLength={24}
                pattern="[a-zA-Z][a-zA-Z0-9_]*"
                placeholder="il_tuo_nome"
              />
            </div>
            <span className="field-hint">
              Da 3 a 24 caratteri: lettere, numeri e underscore.
            </span>
          </label>
        </>
      )}
      {mode !== "reset" && (
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="nome@esempio.it"
          />
        </label>
      )}
      {mode !== "forgot" && (
        <label>
          <span className="label-row">
            {mode === "reset" ? "Nuova password" : "Password"}
            {mode === "login" && (
              <Link href="/forgot-password">Dimenticata?</Link>
            )}
          </span>
          <input
            name="password"
            type="password"
            required
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder={
              mode === "login" ? "La tua password" : "Almeno 12 caratteri"
            }
          />
          {mode !== "login" && (
            <span className="field-hint">
              Una frase lunga è più facile da ricordare.
            </span>
          )}
        </label>
      )}
      {mode === "reset" && (
        <input name="token" type="hidden" value={token ?? ""} />
      )}
      {state.message && (
        <p
          className={`form-message ${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className="button button-primary"
        disabled={pending || (mode === "forgot" && state.status === "success")}
      >
        {pending ? (
          <>
            <LoaderCircle className="spin" size={18} /> Un momento…
          </>
        ) : (
          <>
            {options[mode].button}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
