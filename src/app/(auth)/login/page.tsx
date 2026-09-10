import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
export const metadata = { title: "Accedi" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string;
    reset?: string;
    deleted?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <>
      <div className="auth-switch">
        Non sei ancora dei nostri? <Link href="/register">Registrati</Link>
      </div>
      <div className="auth-box">
        <p className="eyebrow">BENTORNATO A CASA</p>
        <h1>Bello rivederti.</h1>
        <p className="muted">Il tuo spazio e le tue persone ti aspettano.</p>
        {params.registered === "1" && (
          <p className="notice" role="status">
            Il tuo profilo è pronto. Accedi per iniziare.
          </p>
        )}
        {params.reset === "1" && (
          <p className="notice" role="status">
            Password aggiornata. Accedi con la nuova password.
          </p>
        )}
        {params.deleted === "1" && (
          <p className="notice" role="status">
            Il tuo account è stato eliminato.
          </p>
        )}
        <AuthForm mode="login" />
        <p className="auth-bottom">Le tue persone. In ordine di tempo.</p>
      </div>
    </>
  );
}
