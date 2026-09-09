import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const now = new Date();
  await db.$transaction([
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    db.session.deleteMany({ where: { expires: { lt: now } } }),
  ]);
  console.log("Expired authentication records removed.");
} finally {
  await db.$disconnect();
}
