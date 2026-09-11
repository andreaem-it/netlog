"use client";
import { useActionState, useState } from "react";
import { updateProfileAction } from "../actions";
import { initialFormState } from "@/features/auth/schemas";

export function ProfileForm({
  profile,
}: {
  profile: {
    name: string;
    bio: string;
    city: string | null;
    birthDate: Date | null;
    visibility: string;
    messagePermission: string;
    recordVisits: boolean;
    showVisitors: boolean;
    notifyVisits: boolean;
    showOnline: boolean;
  };
}) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    initialFormState,
  );
  // Controlled values prevent the Server Action form reset from restoring an
  // old privacy selection after a successful save.
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [city, setCity] = useState(profile.city ?? "");
  const [birthDate, setBirthDate] = useState(
    profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
  );
  const [visibility, setVisibility] = useState(profile.visibility);
  const [messagePermission, setMessagePermission] = useState(
    profile.messagePermission,
  );
  const [recordVisits, setRecordVisits] = useState(profile.recordVisits);
  const [showVisitors, setShowVisitors] = useState(profile.showVisitors);
  const [notifyVisits, setNotifyVisits] = useState(profile.notifyVisits);
  const [showOnline, setShowOnline] = useState(profile.showOnline);
  return (
    <form action={action} className="form-stack">
      <label>
        Nome visualizzato
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
      </label>
      <label>
        Qualcosa di te
        <textarea
          name="bio"
          maxLength={500}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Le cose che ami, un pensiero, un piccolo pezzo di te…"
        />
        <span className="field-hint">
          Massimo 500 caratteri. Non inserire informazioni riservate.
        </span>
      </label>
      <label>
        Città{" "}
        <input
          name="city"
          maxLength={80}
          value={city}
          onChange={(event) => setCity(event.target.value)}
          autoComplete="address-level2"
          placeholder="Dove ti senti a casa?"
        />
      </label>
      <label>
        Data di nascita
        <input
          type="date"
          name="birthDate"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          autoComplete="bday"
        />
        <span className="field-hint">
          Facoltativa e non mostrata pubblicamente sul profilo.
        </span>
      </label>
      <label>
        Chi può vedere il tuo profilo?
        <select name="visibility" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <option value="PUBLIC">Tutti · profilo pubblico</option>
          <option value="PRIVATE">Solo io · profilo privato</option>
        </select>
        <span className="field-hint">
          La tua email non viene mai mostrata nel profilo.
        </span>
      </label>
      <label>
        Chi può scriverti un messaggio?
        <select
          name="messagePermission"
          value={messagePermission}
          onChange={(event) => setMessagePermission(event.target.value)}
        >
          <option value="FRIENDS">Solo amici</option>
          <option value="EVERYONE">Tutti</option>
          <option value="NOBODY">Nessuno</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          name="showOnline"
          checked={showOnline}
          onChange={(event) => setShowOnline(event.target.checked)}
        />{" "}
        Mostra agli amici quando sono online e quando sto scrivendo
      </label>
      <label>
        <input
          type="checkbox"
          name="recordVisits"
          checked={recordVisits}
          onChange={(event) => setRecordVisits(event.target.checked)}
        />{" "}
        Registra chi visita il mio profilo
      </label>
      {recordVisits && (
        <>
          <label>
            <input
              type="checkbox"
              name="showVisitors"
              checked={showVisitors}
              onChange={(event) => setShowVisitors(event.target.checked)}
            />{" "}
            Mostrami chi mi ha visitato (ultimi 30 giorni)
          </label>
          <label>
            <input
              type="checkbox"
              name="notifyVisits"
              checked={notifyVisits}
              onChange={(event) => setNotifyVisits(event.target.checked)}
            />{" "}
            Avvisami quando qualcuno visita il mio profilo
          </label>
        </>
      )}
      {state.message && (
        <p
          className={`form-message ${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
      <button className="button button-primary" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva le modifiche"}
      </button>
    </form>
  );
}
