import { notFound } from "next/navigation";
import { requireUser } from "@/server/authorization/session";
import {
  getGroupConversation,
  getMessages,
  isAnyoneElseTyping,
} from "@/features/messages/queries";
import { markConversationRead } from "@/features/messages/service";
import { leaveGroupAction } from "@/features/messages/actions";
import { GroupMessageComposer } from "@/features/messages/components/group-message-composer";
import { ThreadPolling } from "@/features/messages/components/thread-polling";
import { PresenceHeartbeat } from "@/features/messages/components/presence-heartbeat";

export const metadata = { title: "Gruppo" };

export default async function GroupConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireUser();
  const conversation = await getGroupConversation(user.id, conversationId);
  if (!conversation) notFound();
  const [messages, someoneTyping] = await Promise.all([
    getMessages(conversationId),
    isAnyoneElseTyping(conversationId, user.id),
  ]);
  await markConversationRead(user.id, conversationId);
  return (
    <>
      <ThreadPolling />
      <PresenceHeartbeat />
      <div className="page-title">
        <div>
          <p className="eyebrow">
            GRUPPO · {conversation.members.length} PERSONE
          </p>
          <h1>{conversation.name}</h1>
          {someoneTyping && <p className="muted">Qualcuno sta scrivendo…</p>}
        </div>
        <form action={leaveGroupAction.bind(null, conversationId)}>
          <button className="button button-subtle" type="submit">
            Lascia il gruppo
          </button>
        </form>
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
            {message.senderId !== user.id && (
              <strong style={{ display: "block", fontSize: "0.75rem" }}>
                {message.senderName}
              </strong>
            )}
            {message.body}
          </p>
        ))}
      </section>
      <GroupMessageComposer conversationId={conversationId} />
    </>
  );
}
