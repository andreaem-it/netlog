import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No temporary port.");
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

function run(args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command exited ${code}`)),
    );
  });
}

function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) reject(new Error("App server did not start in time."));
          else setTimeout(attempt, 300);
        });
    };
    attempt();
  });
}

const directory = await mkdtemp(path.join(tmpdir(), "social-e2e-"));
const dbPort = await freePort();
const appPort = await freePort();
const password = randomBytes(24).toString("hex");
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(directory, "db"),
  port: dbPort,
  user: "social_e2e",
  password,
  authMethod: "scram-sha-256",
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1", "-k", directory],
  onLog: () => {},
  onError: () => {},
});
const appUrl = `http://127.0.0.1:${appPort}`;
const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: `postgresql://social_e2e:${password}@127.0.0.1:${dbPort}/social_e2e`,
  AUTH_SECRET: randomBytes(32).toString("hex"),
  APP_URL: appUrl,
  MAIL_TRANSPORT: "file",
  NODE_ENV: "test",
  PORT: String(appPort),
};

let appProcess: ChildProcess | undefined;
try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase("social_e2e");
  await run(["exec", "prisma", "migrate", "deploy"], env);
  // ponytail: build+start instead of `next dev` — the dev server's Turbopack
  // HMR panics under Playwright's fast navigations (unrelated to app code,
  // reproduced identically against a blank logout click); a production
  // build is also what's actually deployed, so it's the more honest target.
  await run(["exec", "next", "build"], env);
  appProcess = spawn(
    process.execPath,
    [
      "./node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(appPort),
    ],
    { env, stdio: "inherit", detached: true },
  );
  await waitForServer(appUrl, 60_000);
  await run(["exec", "playwright", "test"], env);
} finally {
  // ponytail: next dev forks a next-server child; killing only the direct
  // child leaves it running. detached:true puts it in its own process
  // group, so a negative pid kills the whole tree.
  if (appProcess?.pid) {
    try {
      process.kill(-appProcess.pid, "SIGKILL");
    } catch {
      appProcess.kill();
    }
  }
  await postgres.stop();
  await rm(directory, { recursive: true, force: true });
}
