import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import { listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";

export const metadata = { title: "Notifiche" };

const MESSAGE: Record<string, (actor: string) => string> = {
  FRIEND_REQUEST: (actor) => `${actor} ti ha inviato una richiesta di amicizia.`,
  FRIEND_ACCEPTED: (actor) => `${actor} ha accettato la tua richiesta di amicizia.`,
  POST_LIKE: (actor) => `A ${actor} piace un tuo post.`,
  POST_COMMENT: (actor) => `${actor} ha commentato un tuo post.`,
  PROFILE_VIEW: (actor) => `${actor} ha visitato il tuo profilo.`,
  MESSAGE: (actor) => `Nuovo messaggio da ${actor}.`,
};

export default async function NotifichePage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const user = await requireUser();
  const { notifications, nextCursor } = await listNotifications(user.id, cursor);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">SEMPRE AGGIORNATO</p>
          <h1>Notifiche.</h1>
        </div>
        {notifications.some((n) => n.unread) && (
          <form action={markAllNotificationsReadAction}>
            <button className="button" type="submit">
              Segna tutte come lette
            </button>
          </form>
        )}
      </div>
      <section className="card">
        <div className="card-body stack">
          {notifications.length === 0 && (
            <p className="muted">Non hai ancora nessuna notifica.</p>
          )}
          {notifications.map((notification) => {
            const actorName = notification.actorName ?? "Qualcuno";
            const label =
              MESSAGE[notification.type]?.(actorName) ?? "Nuova notifica.";
            const href = notification.actorUsername
              ? `/u/${notification.actorUsername}`
              : "/home";
            return (
              <Link
                key={notification.id}
                href={href}
                className={`button-row${notification.unread ? "" : " muted"}`}
                style={{ justifyContent: "space-between" }}
              >
                <span>{label}</span>
                <span className="muted">
                  {new Intl.DateTimeFormat("it-IT", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(notification.createdAt)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      {nextCursor && (
        <Link
          href={`/notifiche?cursor=${encodeURIComponent(nextCursor)}`}
          className="button"
        >
          Carica altre
        </Link>
      )}
    </>
  );
}
