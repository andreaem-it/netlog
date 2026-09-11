import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import { listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { notificationText } from "@/features/notifications/copy";

export const metadata = { title: "Notifiche" };

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
            const label = notificationText(notification.type, actorName);
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
