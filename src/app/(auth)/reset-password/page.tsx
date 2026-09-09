import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
export const metadata = {
  title: "Nuova password",
  referrer: "no-referrer" as const,
};
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return (
      <div className="auth-box">
        <h1>Questo link non è valido.</h1>
        <p className="muted">
          Richiedi una nuova email per recuperare l’accesso.
        </p>
        <Link href="/forgot-password" className="button button-primary">
          Richiedi un nuovo link
        </Link>
      </div>
    );
  return (
    <div className="auth-box">
      <p className="eyebrow">DI NUOVO NEL TUO SPAZIO</p>
      <h1>Una nuova password.</h1>
      <p className="muted">
        Scegline una lunga, che non usi altrove. Gli altri accessi saranno
        disconnessi.
      </p>
      <AuthForm mode="reset" token={token} />
    </div>
  );
}
