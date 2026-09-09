import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import {
  getDummyHash,
  hashPassword,
  verifyPassword,
} from "@/server/security/password";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { sendEmail } from "@/server/email/send";
import { getEnv } from "@/config/env";
import { brand } from "@/config/brand";
import {
  registerSchema,
  loginSchema,
  emailSchema,
  resetPasswordSchema,
} from "./schemas";

export class AccountInputError extends Error {}
export const tokenDigest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function registerAccount(input: unknown, identity: string) {
  const data = registerSchema.parse(input);
  await consumeRateLimit("register", identity, 10, 3600);
  const passwordHash = await hashPassword(data.password);
  try {
    return await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        profile: { create: { username: data.username } },
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AccountInputError(
        "Non è possibile usare questi dati. Prova un altro username o accedi al tuo account.",
      );
    }
    throw error;
  }
}

export async function authenticateAccount(input: unknown, identity: string) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  await consumeRateLimit("login-ip", identity, 60, 900);
  await consumeRateLimit("login-email", parsed.data.email, 10, 900);
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      status: true,
      sessionVersion: true,
    },
  });
  const valid = await verifyPassword(
    user?.passwordHash ?? (await getDummyHash()),
    parsed.data.password,
  );
  if (!user?.passwordHash || !valid || user.status !== "ACTIVE") return null;
  await db.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion,
  };
}

export async function requestPasswordReset(
  emailInput: unknown,
  identity: string,
) {
  const email = emailSchema.parse(emailInput);
  await consumeRateLimit("reset-ip", identity, 20, 3600);
  await consumeRateLimit("reset-email", email, 3, 3600);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return;
  const token = randomBytes(32).toString("hex");
  const record = await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenDigest(token),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
  const url = new URL("/reset-password", getEnv().APP_URL);
  url.searchParams.set("token", token);
  try {
    await sendEmail({
      to: email,
      subject: `Reimposta la password · ${brand.name}`,
      text: `Per scegliere una nuova password apri questo link entro 30 minuti:\n\n${url.toString()}\n\nSe non hai richiesto il cambio, ignora questa email.`,
    });
  } catch {
    await db.passwordResetToken.delete({ where: { id: record.id } });
    // Do not reveal account existence or log reset tokens / SMTP credentials.
    console.error("password_reset_delivery_failed");
  }
}

export async function resetPassword(input: unknown, identity: string) {
  const data = resetPasswordSchema.parse(input);
  await consumeRateLimit("reset-consume", identity, 20, 900);
  const tokenHash = tokenDigest(data.token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });
  if (!record)
    throw new AccountInputError(
      "Link non valido o scaduto. Richiedi una nuova email.",
    );
  const passwordHash = await hashPassword(data.password);
  await db.$transaction(async (tx) => {
    // Serialize resets for this account, including two different valid tokens.
    const users = await tx.$queryRaw<
      { status: string }[]
    >`SELECT status FROM users WHERE id = ${record.userId}::uuid FOR UPDATE`;
    if (users[0]?.status !== "ACTIVE")
      throw new AccountInputError("Link non valido o scaduto.");
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new AccountInputError(
        "Link non valido o scaduto. Richiedi una nuova email.",
      );
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });
}
