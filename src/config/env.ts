import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1).pipe(z.url("DATABASE_URL non è un URL valido.")),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().min(1).pipe(z.url("APP_URL non è un URL valido.")),
  MAIL_TRANSPORT: z.enum(["file", "smtp"]).default("file"),
  MAIL_FROM: z.string().min(3).default("Community <noreply@example.test>"),
  SMTP_URL: z.string().pipe(z.url("SMTP_URL non è un URL valido.")).optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
});

export function getEnv() {
  // Vercel exposes VERCEL_URL as a hostname without a scheme.
  const clean = (value: string | undefined) => value?.trim().replace(/^(["'])(.*)\1$/, "$2");
  const vercelUrl = clean(process.env.VERCEL_URL);
  const appUrl = clean(process.env.APP_URL) || (vercelUrl ? `https://${vercelUrl}` : undefined);
  const env = schema.parse({
    DATABASE_URL: clean(process.env.DATABASE_URL),
    AUTH_SECRET: clean(process.env.AUTH_SECRET),
    APP_URL: appUrl,
    MAIL_TRANSPORT: clean(process.env.MAIL_TRANSPORT),
    MAIL_FROM: clean(process.env.MAIL_FROM),
    SMTP_URL: clean(process.env.SMTP_URL),
    TRUST_PROXY: clean(process.env.TRUST_PROXY),
  });
  if (
    process.env.NODE_ENV === "production" &&
    (env.MAIL_TRANSPORT !== "smtp" || !env.SMTP_URL)
  ) {
    throw new Error("Production requires SMTP email configuration.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    new URL(env.APP_URL).protocol !== "https:"
  ) {
    throw new Error("Production requires an HTTPS APP_URL.");
  }
  return env;
}
