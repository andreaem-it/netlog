# Fondazioni della prima milestone

## Ambito

Monolite modulare Next.js 16, runtime Node.js, TypeScript strict e Prisma 7.10 su PostgreSQL. Niente microservizi, Redis, Elasticsearch, feed algoritmico o mock nel runtime. Le entità dell'intero MVP esistono fin dall'inizio; i servizi vengono implementati nelle milestone relative.

Il nome temporaneo è centralizzato. Si usano componenti piccoli e CSS/Tailwind senza una libreria di componenti aggiuntiva. Avatar iniziali e cover sono elementi grafici astratti, non immagini di utenti esterni.

## Autenticazione

Auth.js Credentials + JWT; registrazione transazionale e Argon2id implementati dall'app. Le tabelle dell'adapter sono predisposte ma non si finge che Session contenga i JWT. La verifica di stato/versione nel callback JWT evita di esporre una sessione revocata anche tramite `/api/auth/session`.

Il recupero password registra solo SHA-256 del token casuale, con scadenza di 30 minuti. Una transazione blocca la riga utente prima di consumare il token e revocare tutti gli altri: due richieste concorrenti non possono consumare lo stesso token o ripristinare una password precedente.

## Privacy e scritture

Il servizio di aggiornamento riceve l'attore autenticato dal confine Server Action. Ignora eventuali userId aggiunti al form. Le query dei profili rispettano stato account, visibilità e blocchi in entrambe le direzioni. Una risposta negata usa lo stesso 404 di una pagina inesistente. I profili pubblici rimangono leggibili anonimamente anche se un account è bloccato.

I controlli di relazione presenti sono verificati da test reali, ma le operazioni di amicizia/blocco verranno introdotte nella milestone 3 con transazioni e lock per coppia. Lo schema da solo non garantisce la coerenza fra blocchi e amicizie.

## Decisioni rinviate esplicitamente

- Avatar/cover e immagini: storage privato, MIME effettivo, decodifica, limiti byte/pixel, rimozione metadati e accesso autorizzato nella milestone 2. Nessun endpoint upload provvisorio.
- Visite: registrazione dopo apertura effettiva, non nel rendering/prefetch, con lock per coppia e finestra mobile configurabile nella milestone 5. La tabella non è ancora popolata dall'app.
- Presenza: `lastSeenAt` viene aggiornato all'accesso; nessuno stato online viene mostrato senza heartbeat e preferenza privacy.
- Messaggi: vincoli database già presenti, API e UI solo nella milestone 6.
- Paginazione: cursori composti e filtri di autorizzazione prima del limite nelle milestone che introducono liste. La prima versione legge solo profili singoli.
- Verifica email, moderazione e policy di conservazione sono prerequisiti per la beta pubblica, non flussi simulati nella prima milestone.

## Validazione

Test unitari per normalizzazione e policy. Test di integrazione con PostgreSQL temporaneo reale e migrazioni da zero. Le dipendenze sono bloccate nel lockfile. Il fallback database senza Docker è esclusivamente uno strumento locale, non modifica la scelta di PostgreSQL/Docker per lo stack.
