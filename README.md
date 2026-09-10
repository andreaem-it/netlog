# Social network · MVP

Applicazione Next.js 16 centrata sui profili, con nome e descrizione configurati in `src/config/brand.ts`. La prima milestone è implementata; le funzionalità social successive non sono ancora esposte. Non è una release pronta per apertura al pubblico.

## Funzionalità disponibili

- Registrazione email/password con username univoco e creazione atomica del profilo. Invia automaticamente un'email di conferma (token monouso di 24 ore, riemesso a ogni richiesta); l'account resta utilizzabile anche prima della conferma, che si può rifare dalle impostazioni. Richiede la conferma esplicita (checkbox, validata anche lato server) di avere almeno 13 anni e di accettare `/termini` e `/privacy`, entrambe pagine pubbliche con contenuto che riflette onestamente le funzionalità implementate.
- Cancellazione account dalle impostazioni (conferma tramite la password): revoca la sessione ovunque, impedisce l'accesso, oscura il profilo dalla ricerca (nasconde bio/città/data di nascita/avatar/copertina) e libera l'email per un nuovo utilizzo. Lo username resta occupato (il profilo non viene cancellato, solo nascosto). Post, commenti e messaggi restano visibili a chi li ha ricevuti, ma non più collegati all'account (nome sostituito con "Utente eliminato").
- Login/logout con Auth.js Credentials, password Argon2id e sessioni JWT revocabili.
- Recupero password con token monouso di 30 minuti, invio email, protezione dai tentativi ripetuti e revoca delle sessioni precedenti.
- Home personale, profilo pubblico, modifica di nome/bio/città/data di nascita (facoltativa, mai pubblica) e visibilità pubblico/privato.
- Ricerca paginata dei profili pubblici e discoverable, su `/persone`, con esclusione automatica degli utenti bloccati.
- Avatar e copertina personalizzati (JPEG/PNG/WebP, fino a 5&nbsp;MB), caricati direttamente dal browser su Vercel Blob e collegati al profilo.
- Amicizie: richieste, accettazione/rifiuto, annullamento, rimozione e blocco/sblocco utenti, con gestione atomica delle richieste incrociate e delle richieste duplicate a livello di database. Pagina `/amici` per gestire richieste, amici e persone bloccate; azioni disponibili anche dal profilo pubblico.
- Post testuali con visibilità pubblico/solo amici/privato, like e commenti, feed cronologico in home (post propri + amici + pubblici, esclusi gli utenti bloccati). Le immagini nei post non sono ancora supportate.
- Notifiche (richiesta di amicizia, accettazione, like, commento, visita profilo) su `/notifiche`, con segna-tutte-come-lette.
- Visite al profilo su base di consenso esplicito: disattivate di default, l'utente deve attivarle dalle impostazioni. Finestra mobile di 24h per evitare notifiche/registrazioni duplicate dallo stesso visitatore; elenco visitatori (opzionale) limitato agli ultimi 30 giorni.
- Messaggi privati 1:1 su `/messaggi`, con permesso configurabile (amici/tutti/nessuno), invio idempotente (stesso `clientId` non duplica un messaggio in caso di doppio submit o retry), conteggio dei non letti e aggiornamento della conversazione tramite polling ogni 5 secondi.
- Segnalazione di post e profili (spam, molestie, incitamento all'odio, nudità, altro), con vincolo a livello database che impedisce di segnalare due volte lo stesso contenuto o di segnalare se stessi. Pannello di moderazione su `/moderazione` (elenco segnalazioni aperte, segna come risolta, elimina il post segnalato, sospendi l'utente segnalato), visibile solo a chi ha l'email in `ADMIN_EMAILS`; a chiunque altro la pagina restituisce 404, senza rivelarne l'esistenza. Non esiste ancora un ruolo admin persistito nel database: è un semplice elenco email in una variabile d'ambiente, volutamente senza colonna/bootstrap dato che nessun'altra funzione ne ha ancora bisogno.
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

Il comando di build su Vercel è sovrascritto in `vercel.json` (`prisma migrate deploy && prisma generate && next build`): ogni deploy applica automaticamente le migrazioni pendenti al database di produzione prima di buildare, usando le credenziali che Vercel già inietta nell'ambiente di build.

`pnpm db:cleanup` rimuove token, sessioni database e contatori scaduti. Programmare questo comando prima del rilascio; non è stato creato alcun job sul sistema dell'utente.

## Backup e ripristino

Il database di produzione è Neon (PostgreSQL gestito). Neon esegue backup continui e offre point-in-time recovery (PITR) nativo: non è stato creato alcun job di backup applicativo, per evitare di duplicare una funzionalità già coperta dalla piattaforma. In caso di ripristino:

1. Dalla dashboard Neon, creare un branch dal punto nel tempo desiderato (entro la finestra di retention del piano attivo) invece di ripristinare in-place sul branch di produzione.
2. Verificare i dati sul branch temporaneo prima di promuoverlo o di ripuntare `DATABASE_URL` su di esso.
3. Aggiornare `DATABASE_URL` nelle env Vercel solo dopo la verifica, poi ridistribuire.

La finestra di retention dipende dal piano Neon attivo: verificarla nella dashboard prima di assumere una copertura specifica in giorni.

## Misure delle query

Le query più calde (feed cronologico, ricerca profili, conversazioni, notifiche) sono già coperte da indici compositi dedicati nello schema Prisma (es. `Post` su `[authorId, createdAt desc, id desc]`, `Notification` su `[recipientId, createdAt desc, id desc]`, `Message` su `[conversationId, createdAt desc, id desc]`). Con i volumi attuali (ambiente demo/collaudo, decine di righe) un `EXPLAIN ANALYZE` non produce numeri significativi: non sono stati aggiunti indici aggiuntivi in modo speculativo.

Nota per il futuro: `getFeed` filtra con un `OR` tra post propri, pubblici e "solo amici" e ordina globalmente per `createdAt`, quindi l'indice su `authorId` non copre da solo il ramo `PUBLIC`. Se in produzione `EXPLAIN ANALYZE` su `getFeed` mostrasse un seq scan con volumi reali, il primo intervento da valutare è un indice su `Post([visibility, createdAt(sort: Desc), id(sort: Desc)])`.

## Suite E2E

`pnpm test:e2e` avvia un PostgreSQL temporaneo (stesso meccanismo di `pnpm test:integration`), applica le migrazioni, avvia l'app su una porta libera e lancia Playwright (Chromium) contro il percorso critico: registrazione, login, modifica profilo, creazione post, like, logout e nuovo login. Richiede `npx playwright install chromium` la prima volta. Il browser Playwright non è installato automaticamente da `pnpm install`.

## Prossime milestone

1. **Completata:** fondazioni, identità, reset password, profilo base, seed e primi test.
2. **Completata:** data di nascita opzionale (mai esposta pubblicamente), ricerca paginata dei profili pubblici, avatar/cover su Vercel Blob.
3. **Completata:** amicizie, richieste (con auto-accettazione se incrociate), blocchi, privacy e autorizzazioni concorrenti demandate ai vincoli PostgreSQL (indice parziale sulle richieste pendenti, vincolo unico sulle amicizie).
4. **In parte completata:** post testuali, like, commenti e feed cronologico in home, con la stessa policy di visibilità/blocchi dei profili. Le immagini nei post restano da fare (riusano lo stesso backend di storage di avatar/copertina, ma serve legare l'upload al post prima di crearlo).
5. **Completata:** notifiche, visite al profilo su consenso con finestra mobile, conservazione dati (`pnpm db:cleanup` ora purga anche visite oltre 30 giorni e notifiche lette oltre 90 giorni).
6. **Completata:** messaggi 1:1, permesso configurabile, invio idempotente, non letti, polling.
7. **Completata:** hardening (header di sicurezza già presenti, verificati), suite E2E automatizzata (`pnpm test:e2e`), misure delle query (indici già coperti, documentati in "Misure delle query"), backup/ripristino (PITR nativo di Neon, documentato) e deploy (già in produzione su Vercel dalle milestone precedenti).

Prima della beta pubblica restano inoltre configurazione SMTP effettiva, `ADMIN_EMAILS` da impostare in produzione (senza, nessuno può accedere a `/moderazione`) e aggiornamento delle dipendenze major disponibili (verificato con `pnpm audit`: nessuna vulnerabilità nota al 2026-09-10). Nessun deploy pubblico è stato eseguito.

**Nota operativa**: la verifica email è implementata a livello di codice (token, pagina `/verify-email`, reinvio dalle impostazioni), ma in produzione **`SMTP_URL` non risulta configurato** (solo `MAIL_TRANSPORT`/`MAIL_FROM` sono presenti nelle env Vercel): finché non viene impostato un provider SMTP reale, l'invio delle email (verifica e anche il recupero password, che ha lo stesso requisito) fallisce silenziosamente lato server — l'utente non riceve alcun errore visibile, semplicemente non arriva l'email. Da configurare prima della beta pubblica.
