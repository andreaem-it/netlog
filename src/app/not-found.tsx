import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="simple-page">
      <p className="eyebrow">NON C’È NIENTE DA MOSTRARE</p>
      <h1>Questo spazio non è disponibile.</h1>
      <p className="muted">
        La pagina non esiste oppure non puoi visualizzarla.
      </p>
      <Link href="/" className="button button-primary">
        Torna al tuo spazio
      </Link>
    </main>
  );
}
