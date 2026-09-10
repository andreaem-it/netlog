import Link from "next/link";
import { Brand } from "@/components/ui/brand";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
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
            <p className="eyebrow">PRIVACY</p>
            <h1>Cosa raccogliamo e perché.</h1>
          </div>
        </div>
        <section className="card card-body stack">
          <p>
            Netlog Reborn è un progetto in fase di sviluppo e collaudo. Questa
            pagina descrive onestamente cosa viene registrato oggi, non un
            testo legale generico.
          </p>
          <h2>Dati raccolti alla registrazione</h2>
          <p>
            Email, password (mai salvata in chiaro: solo l&apos;hash
            Argon2id), nome visualizzato e username. La data di nascita è
            facoltativa e, se inserita, non viene mai mostrata pubblicamente:
            serve solo a verificare l&apos;età minima.
          </p>
          <h2>Dati che scegli di aggiungere</h2>
          <p>
            Bio, città, avatar e immagine di copertina, post, commenti,
            &quot;mi piace&quot;, messaggi privati, amicizie e blocchi. Le foto sono
            salvate su Vercel Blob con URL pubblico: chiunque abbia il link
            diretto può vederle, indipendentemente dalla visibilità del
            profilo.
          </p>
          <h2>Visite al profilo</h2>
          <p>
            Registrate solo se attivi l&apos;opzione dalle impostazioni
            (disattivata di default). Puoi disattivarla in qualsiasi momento.
          </p>
          <h2>Conservazione ed eliminazione</h2>
          <p>
            Le visite al profilo più vecchie di 30 giorni e le notifiche già
            lette più vecchie di 90 giorni vengono rimosse periodicamente.
            Puoi eliminare il tuo account dalle impostazioni in qualsiasi
            momento: l&apos;operazione è immediata e irreversibile, rimuove i dati
            personali identificativi (email, nome, foto) e nasconde il
            profilo. I post e i messaggi già scambiati restano visibili a chi
            li ha ricevuti, ma non sono più collegati a te.
          </p>
          <h2>Con chi condividiamo i dati</h2>
          <p>
            Con nessuno a scopo commerciale. I dati sono ospitati su Neon
            (database) e Vercel Blob (immagini), entrambi fornitori tecnici di
            infrastruttura necessari a far funzionare il servizio.
          </p>
          <h2>Cookie</h2>
          <p>
            Un solo cookie di sessione, necessario per rimanere connesso.
            Nessun cookie di tracciamento o pubblicitario.
          </p>
          <p className="muted">Ultimo aggiornamento: 10 settembre 2026.</p>
        </section>
      </main>
    </>
  );
}
