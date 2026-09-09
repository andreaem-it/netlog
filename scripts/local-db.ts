import EmbeddedPostgres from "embedded-postgres";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(".local/postgres");
await mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
const postgres = new EmbeddedPostgres({
  databaseDir: directory,
  user: "social",
  password: "social_local_only",
  port: 54329,
  authMethod: "scram-sha-256",
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1", "-k", path.resolve(".local")],
  onLog: () => {},
  onError: () => {},
});
try {
  await access(path.join(directory, "PG_VERSION"));
} catch {
  await postgres.initialise();
}
await postgres.start();
const client = postgres.getPgClient("postgres");
await client.connect();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'social'",
);
await client.end();
if (existing.rowCount === 0) await postgres.createDatabase("social");
console.log(
  "PostgreSQL locale pronto su 127.0.0.1:54329. Ctrl+C per arrestare.",
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60_000);
