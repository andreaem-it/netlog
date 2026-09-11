import "server-only";
import { z } from "zod";

export class ConfigurationError extends Error {
  constructor(readonly fields: string[]) {
    super("Configurazione del servizio incompleta. Riprova più tardi.");
    this.name = "ConfigurationError";
  }
}

function clean(value: string | undefined) {
  return value?.trim().replace(/^(["'])(.*)\1$/, "$2") || undefined;
}

function parseConfig<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Include field names only, never environment values.
    throw new ConfigurationError([
      ...new Set(
        result.error.issues.map((issue) =>
          String(issue.path[0] ?? "environment"),
        ),
      ),
    ]);
  }
  return result.data;
}

export function getSecurityEnv() {
  return parseConfig(
    z.object({
      AUTH_SECRET: z.string().min(32),
      TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    }),
    {
      AUTH_SECRET: clean(process.env.AUTH_SECRET),
      TRUST_PROXY: clean(process.env.TRUST_PROXY),
    },
  );
}

export function getAppUrl() {
  const hostname =
    clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    clean(process.env.VERCEL_URL);
  const { APP_URL } = parseConfig(
    z.object({
      APP_URL: z.url().refine((value) => {
        const url = new URL(value);
        return (
          ["https:", "http:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      }),
    }),
    {
      APP_URL:
        clean(process.env.APP_URL) ||
        (hostname ? `https://${hostname}` : undefined),
    },
  );
  if (
    process.env.NODE_ENV === "production" &&
    new URL(APP_URL).protocol !== "https:"
  ) {
    throw new ConfigurationError(["APP_URL"]);
  }
  return APP_URL;
}

export function getMailEnv() {
  const env = parseConfig(
    z.object({
      MAIL_TRANSPORT: z.enum(["file", "smtp"]).default("file"),
      MAIL_FROM: z.string().min(3).default("Community <noreply@example.test>"),
      SMTP_URL: z
        .url()
        .refine((value) =>
          ["smtp:", "smtps:"].includes(new URL(value).protocol),
        )
        .optional(),
    }),
    {
      MAIL_TRANSPORT: clean(process.env.MAIL_TRANSPORT),
      MAIL_FROM: clean(process.env.MAIL_FROM),
      SMTP_URL: clean(process.env.SMTP_URL),
    },
  );
  if (process.env.NODE_ENV === "production" && env.MAIL_TRANSPORT !== "smtp")
    throw new ConfigurationError(["MAIL_TRANSPORT"]);
  if (env.MAIL_TRANSPORT === "smtp" && !env.SMTP_URL)
    throw new ConfigurationError(["SMTP_URL"]);
  return env;
}

// Push notifications are an enhancement, not a hard requirement: if the
// VAPID keys aren't set (e.g. this environment hasn't generated/configured
// them yet), the feature silently no-ops instead of throwing everywhere a
// notification is created — same reasoning as an empty ADMIN_EMAILS below.
export function getVapidKeys() {
  const publicKey = clean(process.env.VAPID_PUBLIC_KEY);
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY);
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: clean(process.env.VAPID_SUBJECT) ?? "mailto:support@example.test",
  };
}

// ponytail: a plain email allowlist is enough moderation access control for
// this stage — no admin role/permissions system exists yet, and one row of
// config beats a users.is_admin column with nobody able to set it in prod.
export function getAdminEmails() {
  return new Set(
    (clean(process.env.ADMIN_EMAILS) ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
