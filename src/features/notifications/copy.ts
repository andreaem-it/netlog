import type { NotificationType } from "@/generated/prisma/client";

const MESSAGE: Record<NotificationType, (actor: string) => string> = {
  FRIEND_REQUEST: (actor) => `${actor} ti ha inviato una richiesta di amicizia.`,
  FRIEND_ACCEPTED: (actor) => `${actor} ha accettato la tua richiesta di amicizia.`,
  POST_LIKE: (actor) => `A ${actor} piace un tuo post.`,
  POST_COMMENT: (actor) => `${actor} ha commentato un tuo post.`,
  PROFILE_VIEW: (actor) => `${actor} ha visitato il tuo profilo.`,
  MESSAGE: (actor) => `Nuovo messaggio da ${actor}.`,
};

export function notificationText(type: NotificationType, actorName: string) {
  return MESSAGE[type](actorName);
}
