# Override delle dipendenze

L'audit iniziale ha individuato vulnerabilità in Nodemailer 7, deepmerge-ts 7 e mysql2 transitivi di Prisma. `pnpm-workspace.yaml` impone:

- Nodemailer 10.0.1: versione corretta per gli advisory relativi a parsing destinatari, accesso file/URL e injection SMTP. Auth.js dichiara peer Nodemailer 7/8, ma questa app usa soltanto Credentials: non usa provider email Auth.js. L'invio SMTP è gestito direttamente e verificato con un server SMTP locale nei test di integrazione. Prima di abilitare un provider email Auth.js va verificata nuovamente la compatibilità.
- deepmerge-ts 8.0.0: corregge GHSA-ggr8-5vv4-36mx; Prisma lo usa per la configurazione. Generazione, migrazioni e build vengono verificati con l'override.
- mysql2 3.23.1: corregge GHSA-3f6p-5ww8-9rcr e GHSA-rgwj-5xj2-c3m3. È transitivo della CLI Prisma; l'app usa PostgreSQL.

Rimuovere gli override quando le versioni upstream incorporeranno le correzioni e l'audit continuerà a passare. Non sono eccezioni che nascondono advisory.
