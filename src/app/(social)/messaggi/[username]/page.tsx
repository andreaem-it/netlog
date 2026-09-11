import Link from "next/link";
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
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { username } = await params;
  const { cursor } = await searchParams;
  const user = await requireUser();
  const conversation = await getConversationWithUsername(user.id, username);
  if (!conversation) notFound();
  const { messages, nextCursor } = conversation.conversationId
    ? await getMessages(conversation.conversationId, cursor)
    : { messages: [], nextCursor: null };
  if (conversation.conversationId && !cursor)
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
        {nextCursor && (
          <Link
            href={`/messaggi/${username}?cursor=${encodeURIComponent(nextCursor)}`}
            className="text-link"
          >
            Carica messaggi precedenti
          </Link>
        )}
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
