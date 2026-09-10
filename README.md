# Social network · MVP

Applicazione Next.js 16 centrata sui profili, con nome e descrizione configurati in `src/config/brand.ts`. La prima milestone è implementata; le funzionalità social successive non sono ancora esposte. Non è una release pronta per apertura al pubblico.

## Funzionalità disponibili

- Registrazione email/password con username univoco e creazione atomica del profilo.
- Login/logout con Auth.js Credentials, password Argon2id e sessioni JWT revocabili.
- Recupero password con token monouso di 30 minuti, invio email, protezione dai tentativi ripetuti e revoca delle sessioni precedenti.
- Home personale, profilo pubblico, modifica di nome/bio/città/data di nascita (facoltativa, mai pubblica) e visibilità pubblico/privato.
- Ricerca paginata dei profili pubblici e discoverable, su `/persone`, con esclusione automatica degli utenti bloccati.
- Avatar e copertina personalizzati (JPEG/PNG/WebP, fino a 5&nbsp;MB), caricati direttamente dal browser su Vercel Blob e collegati al profilo.
- Amicizie: richieste, accettazione/rifiuto, annullamento, rimozione e blocco/sblocco utenti, con gestione atomica delle richieste incrociate e delle richieste duplicate a livello di database. Pagina `/amici` per gestire richieste, amici e persone bloccate; azioni disponibili anche dal profilo pubblico.
- Post testuali con visibilità pubblico/solo amici/privato, like e commenti, feed cronologico in home (post propri + amici + pubblici, esclusi gli utenti bloccati). Le immagini nei post non sono ancora supportate.
- Query dei profili già compatibili con amicizie e blocchi; queste relazioni hanno schema e test, ma non ancora interfaccia o servizi di gestione.
- Schema Prisma dell'intero MVP, migrazioni SQL con vincoli, seed di 20 utenti, test unitari e integrazione PostgreSQL.

## Avvio con Docker

Prerequisiti: Node.js >= 20.19, pnpm 11.19, Docker Compose.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
```

Generare un segreto con `openssl rand -hex 32` e impostarlo come `AUTH_SECRET` nel file `.env`. Non commettere il file.

```sh
docker compose up -d --wait
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Aprire [localhost:3000](http://localhost:3000) e creare il proprio account. Il database Compose è esposto solo su loopback; password e configurazione Compose sono esclusivamente locali.

## Avvio senza Docker

Per sviluppo e collaudo è disponibile PostgreSQL reale avviato tramite `embedded-postgres`, una dipendenza solo di sviluppo. Non richiede un servizio di sistema e conserva i dati sotto `.local/postgres`.

```sh
pnpm db:local
```

Lasciare aperto il processo e impostare in `.env`:

```text
DATABASE_URL=postgresql://social:social_local_only@127.0.0.1:54329/social
```

In un altro terminale eseguire `pnpm db:generate`, `pnpm db:deploy` e `pnpm dev`. Ctrl+C arresta il database senza rimuovere i dati. Non usare questo percorso in produzione. Le build script dei binari sono autorizzate esplicitamente in `pnpm-workspace.yaml`.

## Email di recupero password

In sviluppo `MAIL_TRANSPORT=file` salva le email in `.local/mail/*.json`, con permessi limitati al proprietario. Aprire il file più recente per seguire il link di reset. Non ci sono token in console né link restituiti al browser tramite l'azione.

Per il recupero password in produzione impostare `MAIL_TRANSPORT=smtp`, `SMTP_URL`, un `MAIL_FROM` verificato e `APP_URL` HTTPS. Il trasporto file è rifiutato in produzione. Registrazione e login non richiedono le impostazioni email: usano il database, `AUTH_SECRET` e la configurazione Auth.js. Gli errori di configurazione sono distinti dagli errori dei campi; nei log sono indicati soltanto i nomi delle variabili da correggere, mai i valori. Le email non sono state inviate a un servizio esterno durante lo sviluppo.

Un file esportato da Vercel che contiene `[SENSITIVE]` non contiene le credenziali effettive: non può essere usato per connettersi a Neon o provare l'autenticazione localmente. Non sostituire con questi segnaposto i valori reali nella dashboard.

## Seed demo

Impostare `SEED_DEMO=true` e una `SEED_PASSWORD` di almeno 12 caratteri in `.env`, quindi:

```sh
pnpm db:seed
```

Il seed crea 20 utenti sintetici, ad esempio `giulia@demo.example.test`, con la password locale configurata. È ripetibile e aggiorna la password dei soli account demo quando `SEED_PASSWORD` cambia. Rifiuta esecuzioni in produzione e host database non locali. I profili demo esistono nel database, non nei componenti di produzione.

## Avatar e copertina

Caricamento diretto dal browser a Vercel Blob (store pubblico `netlog-media`), tramite `/api/media/upload` che genera un token con `@vercel/blob/client` e valida tipo/dimensione file. `BLOB_READ_WRITE_TOKEN` è già collegato al progetto Vercel; in locale è in `.env.local` (non committato).

Il record in `media_assets` e il collegamento al profilo vengono scritti dal webhook `onUploadCompleted`, che Vercel richiama solo su un URL pubblicamente raggiungibile: in sviluppo locale puro il file arriva su Blob ma il profilo non si aggiorna finché non si espone l'app con un tunnel pubblico (es. `ngrok`). In produzione funziona senza passaggi aggiuntivi.

## Collaudo manuale in produzione/staging

Il seed demo non è utilizzabile in produzione (viene rifiutato). Per verificare manualmente signup e login su un ambiente distribuito:

1. Registrare un account usa-e-getta tramite `/register` con un indirizzo sotto il dominio riservato ai test `example.test` (mai risolvibile, mai un dominio reale), ad esempio `nome.cognome+test@example.test`, e una password generata al momento (almeno 12 caratteri, mai una password già in uso altrove).
2. Verificare il login con le stesse credenziali su `/login`: deve reindirizzare a `/home` con la sessione attiva.
3. Non annotare le credenziali di test in commit, issue o `HANDOFF.md`: se serve tracciare che un test è stato eseguito, indicare solo che è stato fatto e l'esito, non i valori usati.
4. Un file `.env` esportato da Vercel che contiene `[SENSITIVE]` è un segnaposto, non un segreto reale: non sostituirlo ai valori nella dashboard e non usarlo per collegarsi a Neon.

## Verifiche

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```

I test di integrazione avviano un database PostgreSQL temporaneo su una porta libera, applicano tutte le migrazioni e rimuovono il cluster al termine. Non usano `.env` per scegliere il database da cancellare. Richiedono l'esecuzione di binari e socket locali; eseguirli con un utente non root.

Coprono registrazioni concorrenti, hash password, account sospesi, reset concorrente/scaduto, revoca sessioni, IDOR sugli aggiornamenti profilo, privacy, blocchi bidirezionali, vincoli amicizie/richieste, partecipanti ai messaggi e rate limiting atomico.

## Regole architetturali

Le pagine compongono l'interfaccia. Le Server Actions validano input e sessione e invocano i servizi di dominio. I moduli server sono protetti con `server-only`. Le letture pubbliche restituiscono DTO espliciti e non espongono email, password, compleanno o informazioni della sessione.

Auth.js è fissato alla versione **5.0.0-beta.32**, compatibile con App Router. La versione beta è una scelta da rivalutare prima del rilascio pubblico; non vengono usate API di autenticazione inventate. L'applicazione gestisce registrazione e password: il Credentials provider non crea utenti automaticamente. Account, Session e VerificationToken sono predisposti nello schema ma il login attuale usa JWT, senza adapter database.

Le sessioni sono controllate contro lo stato account e `sessionVersion`, anche sull'endpoint Auth.js. Il reset incrementa la versione e invalida tutti i token reset ancora pendenti. Questa scelta richiede una lettura DB per la validazione; non utilizza una cache condivisa di autorizzazioni.

Il rate limiter è un UPSERT atomico PostgreSQL. In locale gli accessi diretti condividono un limite per ambiente; il limite per email è indipendente. In produzione attivare `TRUST_PROXY=true` **solo** dietro un proxy che rimuove e riscrive `X-Forwarded-For`, impedendo accessi diretti al server. Senza tale garanzia il client potrebbe falsificare l'identità IP.

Server Actions e Auth.js mantengono le rispettive protezioni CSRF. Non aggiungere Route Handlers mutativi senza verifica dell'origine e protezione CSRF. La policy CSP attuale protegge framing, base e oggetti; non è ancora una policy completa con nonce.

## Migrazioni e manutenzione

Le migrazioni contengono anche vincoli CHECK, un indice parziale sulle richieste pendenti, trigger differiti per i partecipanti e il vincolo del cursore di lettura. Sono intenzionali e non vanno eliminati per allineare solamente il file Prisma. Usare migrazioni versionate, non `db push` in produzione.

`pnpm db:cleanup` rimuove token, sessioni database e contatori scaduti. Programmare questo comando prima del rilascio; non è stato creato alcun job sul sistema dell'utente.

## Prossime milestone

1. **Completata:** fondazioni, identità, reset password, profilo base, seed e primi test.
2. **Completata:** data di nascita opzionale (mai esposta pubblicamente), ricerca paginata dei profili pubblici, avatar/cover su Vercel Blob.
3. **Completata:** amicizie, richieste (con auto-accettazione se incrociate), blocchi, privacy e autorizzazioni concorrenti demandate ai vincoli PostgreSQL (indice parziale sulle richieste pendenti, vincolo unico sulle amicizie).
4. **In parte completata:** post testuali, like, commenti e feed cronologico in home, con la stessa policy di visibilità/blocchi dei profili. Le immagini nei post restano da fare (riusano lo stesso backend di storage di avatar/copertina, ma serve legare l'upload al post prima di crearlo).
5. Visite con finestra mobile e consenso, notifiche e conservazione dei dati.
6. Messaggi individuali, non letti e polling.
7. Hardening, suite E2E automatizzata, misure delle query, backup/ripristino e deploy.

Prima della beta pubblica restano inoltre verifica email, segnalazioni/moderazione, cancellazione account, policy per età/privacy/conservazione, configurazione SMTP/storage e controllo delle dipendenze. Nessun deploy pubblico è stato eseguito.
