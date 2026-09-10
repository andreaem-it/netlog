import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import nodemailer from "nodemailer";
import { getMailEnv } from "@/config/env";

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
}) {
  const env = getMailEnv();
  if (env.MAIL_TRANSPORT === "file") {
    const directory = path.join(process.cwd(), ".local", "mail");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      path.join(directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify(message, null, 2),
      { mode: 0o600 },
    );
    return;
  }
  if (!env.SMTP_URL) throw new Error("SMTP_URL is required.");
  await nodemailer
    .createTransport(env.SMTP_URL, {
      from: env.MAIL_FROM,
    })
    .sendMail(message);
}
