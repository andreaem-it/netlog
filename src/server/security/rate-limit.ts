import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/server/db/client";
import { getEnv } from "@/config/env";

export class RateLimitError extends Error {
  constructor() {
    super("Troppi tentativi. Attendi qualche minuto e riprova.");
  }
}

export function clientIdentity(headers: Headers): string {
  if (getEnv().TRUST_PROXY !== "true") return "direct-local";
  const candidate = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && isIP(candidate) ? candidate : "unknown-proxy-client";
}

export async function consumeRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
) {
  const key = createHmac("sha256", getEnv().AUTH_SECRET)
    .update(`${scope}:${identity}`)
    .digest("hex");
  // Single UPSERT: distributed application instances share the same atomic counter.
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (key, count, expires_at)
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit_buckets.expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE rate_limit_buckets.count + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + ${windowSeconds} * INTERVAL '1 second' ELSE rate_limit_buckets.expires_at END
    RETURNING count`;
  if (!rows[0] || rows[0].count > limit) throw new RateLimitError();
}
