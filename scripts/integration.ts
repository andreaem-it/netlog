import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

const directory = await mkdtemp(path.join(tmpdir(), "social-integration-"));
const server = createServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("No temporary port.");
const port = address.port;
await new Promise<void>((resolve) => server.close(() => resolve()));
const password = randomBytes(24).toString("hex");
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(directory, "db"),
  port,
  user: "social_test",
  password,
  authMethod: "scram-sha-256",
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1", "-k", directory],
  onLog: () => {},
  onError: () => {},
});
const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: `postgresql://social_test:${password}@127.0.0.1:${port}/social_test`,
  AUTH_SECRET: randomBytes(32).toString("hex"),
  APP_URL: "http://localhost:3000",
  MAIL_TRANSPORT: "file",
  NODE_ENV: "test",
};
async function run(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Test command exited ${code}`)),
    );
  });
}
try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase("social_test");
  await run(["exec", "prisma", "migrate", "deploy"]);
  await run(["exec", "vitest", "run", "--project", "integration"]);
} finally {
  await postgres.stop();
  await rm(directory, { recursive: true, force: true });
}
