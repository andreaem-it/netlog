import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import { listConversations } from "@/features/messages/queries";
import { PresenceHeartbeat } from "@/features/messages/components/presence-heartbeat";

export const metadata = { title: "Messaggi" };

export default async function MessaggiPage() {
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  return (
    <>
      <PresenceHeartbeat />
      <div className="page-title">
        <div>
          <p className="eyebrow">LE TUE CONVERSAZIONI</p>
          <h1>Messaggi.</h1>
        </div>
        <Link href="/messaggi/nuovo-gruppo" className="button">
          Crea gruppo
        </Link>
      </div>
      <section className="card">
        <div className="card-body stack">
          {conversations.length === 0 && (
            <p className="muted">
              Non hai ancora nessuna conversazione. Scrivi a un amico dal suo
              profilo.
            </p>
          )}
          {conversations.map((conversation) => (
            <Link
              key={conversation.conversationId}
              href={
                conversation.isGroup
                  ? `/messaggi/gruppo/${conversation.conversationId}`
                  : `/messaggi/${conversation.otherUsername}`
              }
              className="button-row"
              style={{ justifyContent: "space-between" }}
            >
              <span>
                <strong>{conversation.title}</strong>
                {conversation.otherOnline && (
                  <span className="online-dot" aria-hidden="true" />
                )}
                <br />
                <span className="muted">{conversation.lastMessage}</span>
              </span>
              {conversation.unreadCount > 0 && (
                <span className="pill">{conversation.unreadCount}</span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
