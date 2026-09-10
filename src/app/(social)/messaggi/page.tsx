import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import { listConversations } from "@/features/messages/queries";

export const metadata = { title: "Messaggi" };

export default async function MessaggiPage() {
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">LE TUE CONVERSAZIONI</p>
          <h1>Messaggi.</h1>
        </div>
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
              href={`/messaggi/${conversation.otherUsername}`}
              className="button-row"
              style={{ justifyContent: "space-between" }}
            >
              <span>
                <strong>{conversation.otherName}</strong>
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
