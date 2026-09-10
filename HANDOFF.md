# Netlog — handoff condiviso

Questo file coordina il lavoro tra Codex, Claude e il proprietario del repository.

## Regole di coordinamento

1. Prima di modificare un’area, aggiungi il tuo nome alla colonna **Lock** della relativa attività.
2. Mantieni un solo lock per attività e rilascialo appena hai terminato verifica e commit.
3. Non modificare file coperti da un lock attivo. Se serve una modifica urgente, scrivi prima una nota nella sezione **Messaggi**.
4. Ogni attività completata deve indicare commit, test eseguiti e risultato del deploy, se applicabile.
5. Un lock scaduto da oltre 2 ore può essere rilevato come abbandonato e segnalato, ma non rimosso senza una nota.

## Lock attivi

| Area/file | Lock | Dal | Scade | Nota |
|---|---|---|---|---|
| — | — | — | — | Nessun lock attivo |

Formato consigliato: `Claude — 2026-09-10 14:00 — 16:00`.

## TODO

| Stato | Priorità | Attività | Area/file | Lock | Verifica |
|---|---:|---|---|---|---|
| IN CORSO | P0 | Diagnosticare e completare migrazione Neon in produzione | `prisma/`, Vercel env | Codex | Registrazione online crea un account |
| FATTO | P0 | Pubblicare il fix che mostra l’errore di login | `src/features/auth/actions.ts` | — | `pnpm lint`, `pnpm typecheck` verdi; commit creato |
| TODO | P0 | Verificare signup e login end-to-end su `https://netlog-phi.vercel.app` | browser/Vercel | — | Account test entra in `/home` |
| TODO | P1 | Aggiungere test per il risultato `signIn` con `error=` | `src/`, test auth | — | Test unitario verde |
| TODO | P1 | Documentare credenziali e procedura di test senza segreti reali | `README.md` | — | README aggiornato |
| TODO | P2 | Sviluppare il prossimo modulo MVP concordato | da definire | — | Criteri aggiunti prima di iniziare |

## Lavoro completato di recente

- Separata la validazione dei dati dagli errori di configurazione server.
- Aggiornato `AUTH_SECRET` su Vercel e creato un nuovo deploy production.
- Eseguiti con successo lint, typecheck e suite di test locale.

## Messaggi

| Data | Da | A | Messaggio |
|---|---|---|---|
| 2026-09-10 | Codex | Claude | Il blocco attuale è la registrazione production: controllare migrazioni Neon e `DATABASE_URL` senza esporre valori sensibili. |

## Changelog handoff

- 2026-09-10 — Codex: creato questo file e registrato il fix login locale non ancora pushato.
- 2026-09-10 — Claude: verificato lint/typecheck e committato il fix login (`error=` in callback URL gestito senza redirect silenzioso).
