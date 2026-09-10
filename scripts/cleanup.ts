import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const now = new Date();
  // Retention: profile views older than 30 days (matches the visitors
  // window shown to owners); read notifications older than 90 days.
  // Unread notifications are never purged by age.
  const visitCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const notificationCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  await db.$transaction([
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    db.session.deleteMany({ where: { expires: { lt: now } } }),
    db.profileView.deleteMany({ where: { viewedAt: { lt: visitCutoff } } }),
    db.notification.deleteMany({
      where: { readAt: { not: null, lt: notificationCutoff } },
    }),
  ]);
  console.log("Expired authentication records removed.");
} finally {
  await db.$disconnect();
}
