"use server";

import { requireUser } from "@/server/authorization/session";
import { pushSubscriptionSchema } from "./schemas";
import { removeSubscription, saveSubscription } from "./service";

export async function subscribePushAction(subscriptionJson: string) {
  const actor = await requireUser();
  const subscription = pushSubscriptionSchema.parse(JSON.parse(subscriptionJson));
  await saveSubscription(actor.id, subscription);
}

export async function unsubscribePushAction(endpoint: string) {
  const actor = await requireUser();
  await removeSubscription(actor.id, endpoint);
}
