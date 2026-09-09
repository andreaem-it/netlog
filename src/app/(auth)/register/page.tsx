import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
export const metadata = { title: "Registrati" };
export default function RegisterPage() {
  return (
    <>
      <div className="auth-switch">
        Hai già un profilo? <Link href="/login">Accedi</Link>
      </div>
      <div className="auth-box">
        <p className="eyebrow">FACCIAMO CONOSCENZA</p>
        <h1>Qui puoi essere tu.</h1>
        <p className="muted">Bastano poche cose per creare il tuo spazio.</p>
        <AuthForm mode="register" />
        <p className="auth-bottom">
          Email e password rimangono private. Potrai scegliere la visibilità del
          profilo nelle impostazioni.
        </p>
      </div>
    </>
  );
}
