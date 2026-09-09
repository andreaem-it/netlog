"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="simple-page">
      <h1>Un piccolo contrattempo.</h1>
      <p className="muted">
        Non riusciamo a caricare questa pagina. Riprova tra poco.
      </p>
      <button onClick={reset} className="button button-primary">
        Riprova
      </button>
    </main>
  );
}
