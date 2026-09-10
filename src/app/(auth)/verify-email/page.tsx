import Link from "next/link";
import { verifyEmailAction } from "@/features/auth/actions";

export const metadata = {
  title: "Conferma email",
  referrer: "no-referrer" as const,
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return (
      <div className="auth-box">
        <h1>Questo link non è valido.</h1>
        <p className="muted">
          Accedi e richiedi una nuova email di conferma dalle impostazioni.
        </p>
        <Link href="/login" className="button button-primary">
          Vai al login
        </Link>
      </div>
    );
  return (
    <div className="auth-box">
      <p className="eyebrow">QUASI FATTO</p>
      <h1>Conferma la tua email.</h1>
      <p className="muted">
        Un ultimo passo per attivare tutte le funzioni del tuo account.
      </p>
      {error && (
        <p className="form-message error" role="alert">
          Link non valido o scaduto. Accedi e richiedi una nuova email dalle
          impostazioni.
        </p>
      )}
      <form action={verifyEmailAction}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="button button-primary">
          Conferma la mia email
        </button>
      </form>
    </div>
  );
}
