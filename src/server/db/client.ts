import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { socialDb?: PrismaClient };

export const db =
  globalDb.socialDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    }),
  });

if (process.env.NODE_ENV !== "production") globalDb.socialDb = db;
