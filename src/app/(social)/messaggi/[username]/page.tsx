import { notFound } from "next/navigation";
import { requireUser } from "@/server/authorization/session";
import {
  getConversationWithUsername,
  getMessages,
} from "@/features/messages/queries";
import { markConversationRead } from "@/features/messages/service";
import { MessageComposer } from "@/features/messages/components/message-composer";
import { ThreadPolling } from "@/features/messages/components/thread-polling";
import { PresenceHeartbeat } from "@/features/messages/components/presence-heartbeat";

export const metadata = { title: "Conversazione" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await requireUser();
  const conversation = await getConversationWithUsername(user.id, username);
  if (!conversation) notFound();
  const messages = conversation.conversationId
    ? await getMessages(conversation.conversationId)
    : [];
  if (conversation.conversationId)
    await markConversationRead(user.id, conversation.conversationId);
  return (
    <>
      <ThreadPolling />
      <PresenceHeartbeat />
      <div className="page-title">
        <div>
          <p className="eyebrow">CONVERSAZIONE</p>
          <h1>{conversation.otherName}</h1>
          {conversation.otherTyping ? (
            <p className="muted">Sta scrivendo…</p>
          ) : conversation.otherOnline ? (
            <p className="muted">
              <span className="online-dot" aria-hidden="true" /> Online
            </p>
          ) : null}
        </div>
      </div>
      <section className="card card-body stack">
        {messages.length === 0 && (
          <p className="muted">Nessun messaggio ancora. Scrivi il primo qui sotto.</p>
        )}
        {messages.map((message) => (
          <p
            key={message.id}
            style={{
              alignSelf: message.senderId === user.id ? "flex-end" : "flex-start",
              maxWidth: "70%",
            }}
          >
            {message.body}
          </p>
        ))}
      </section>
      <MessageComposer username={username} conversationId={conversation.conversationId} />
    </>
  );
}
