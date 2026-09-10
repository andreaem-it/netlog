import Link from "next/link";
import { Brand } from "@/components/ui/brand";

export const metadata = { title: "Termini di servizio" };

export default function TermsPage() {
  return (
    <>
      <header className="app-header">
        <Brand />
        <Link href="/" className="button">
          Torna indietro
        </Link>
      </header>
      <main id="main" className="public-profile">
        <div className="page-title">
          <div>
            <p className="eyebrow">TERMINI DI SERVIZIO</p>
            <h1>Le regole del tuo spazio.</h1>
          </div>
        </div>
        <section className="card card-body stack">
          <p>
            Netlog Reborn è un progetto in fase di sviluppo e collaudo: non è
            ancora una release aperta al pubblico e i termini possono cambiare
            senza preavviso finché non verrà annunciata una beta pubblica.
          </p>
          <h2>Chi può usarlo</h2>
          <p>
            Serve avere almeno 13 anni. Ogni account deve corrispondere a una
            persona reale: non sono ammessi account falsi, automatizzati o
            creati per impersonare altre persone.
          </p>
          <h2>Cosa non è permesso</h2>
          <p>
            Contenuti illegali, molestie, incitamento all&apos;odio, spam o
            tentativi di aggirare le misure di sicurezza. Chi segnala un
            contenuto in buona fede non subisce conseguenze; chi pubblica
            contenuti che violano queste regole può vedersi eliminare il
            contenuto o sospendere l&apos;account.
          </p>
          <h2>Il tuo account</h2>
          <p>
            Sei responsabile della password del tuo account. Puoi eliminare
            il tuo account in qualsiasi momento dalle impostazioni: l&apos;azione è
            irreversibile e revoca subito ogni sessione attiva.
          </p>
          <h2>Nessuna garanzia</h2>
          <p>
            Il servizio è fornito &quot;così com&apos;è&quot;, senza garanzie di
            disponibilità continua, durante questa fase di sviluppo.
          </p>
          <p className="muted">Ultimo aggiornamento: 10 settembre 2026.</p>
        </section>
      </main>
    </>
  );
}
