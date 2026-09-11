import "server-only";
import webpush from "web-push";
import { db } from "@/server/db/client";
import { getVapidKeys } from "@/config/env";

let configured = false;
function ensureConfigured() {
  if (configured) return false;
  const keys = getVapidKeys();
  if (!keys) return false;
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  configured = true;
  return true;
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

// Best-effort: a missing VAPID config or a failed delivery never blocks the
// notification itself (already saved in the DB) — push is a nice-to-have
// nudge, not the source of truth.
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string },
) {
  if (!(configured || ensureConfigured())) return;
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        // 404/410: the browser dropped this subscription, stop targeting it.
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410)
          await db.pushSubscription
            .delete({ where: { endpoint: subscription.endpoint } })
            .catch(() => {});
      }
    }),
  );
}
