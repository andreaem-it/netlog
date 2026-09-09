import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
export const metadata = { title: "Recupera la password" };
export default function ForgotPage() {
  return (
    <div className="auth-box">
      <p className="eyebrow">RIPARTIAMO DA QUI</p>
      <h1>Capita di dimenticare.</h1>
      <p className="muted">
        Inserisci la tua email. Ti invieremo un link per scegliere una nuova
        password.
      </p>
      <AuthForm mode="forgot" />
      <Link className="auth-back" href="/login">
        Torna all’accesso
      </Link>
    </div>
  );
}
