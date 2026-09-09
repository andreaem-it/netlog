import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.url(),
  MAIL_TRANSPORT: z.enum(["file", "smtp"]).default("file"),
  MAIL_FROM: z.string().min(3).default("Community <noreply@example.test>"),
  SMTP_URL: z.url().optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
});

export function getEnv() {
  const env = schema.parse(process.env);
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
