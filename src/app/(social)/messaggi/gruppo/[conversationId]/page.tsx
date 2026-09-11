import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/authorization/session";
import {
  getGroupConversation,
  getMessages,
  isAnyoneElseTyping,
  listAddableFriends,
} from "@/features/messages/queries";
import { markConversationRead } from "@/features/messages/service";
import { leaveGroupAction, removeGroupMemberAction } from "@/features/messages/actions";
import { GroupMessageComposer } from "@/features/messages/components/group-message-composer";
import { RenameGroupForm } from "@/features/messages/components/rename-group-form";
import { AddGroupMembersForm } from "@/features/messages/components/add-group-members-form";
import { ThreadPolling } from "@/features/messages/components/thread-polling";
import { PresenceHeartbeat } from "@/features/messages/components/presence-heartbeat";

export const metadata = { title: "Gruppo" };

export default async function GroupConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { conversationId } = await params;
  const { cursor } = await searchParams;
  const user = await requireUser();
  const conversation = await getGroupConversation(user.id, conversationId);
  if (!conversation) notFound();
  const isOwner = conversation.ownerId === user.id;
  const [{ messages, nextCursor }, someoneTyping, addableFriends] = await Promise.all([
    getMessages(conversationId, cursor),
    isAnyoneElseTyping(conversationId, user.id),
    isOwner ? listAddableFriends(user.id, conversationId) : Promise.resolve([]),
  ]);
  if (!cursor) await markConversationRead(user.id, conversationId);
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
      <details className="card card-body" style={{ marginBottom: 24 }}>
        <summary>Gestisci gruppo</summary>
        <div className="stack" style={{ marginTop: 16 }}>
          <div>
            <h3>Partecipanti</h3>
            <div className="stack" style={{ gap: 8 }}>
              {conversation.members.map((member) => (
                <div
                  key={member.id}
                  className="button-row"
                  style={{ justifyContent: "space-between" }}
                >
                  <span>
                    {member.name}
                    {member.id === conversation.ownerId && " · creatore"}
                  </span>
                  {isOwner && member.id !== conversation.ownerId && (
                    <form
                      action={removeGroupMemberAction.bind(null, conversationId, member.id)}
                    >
                      <button className="button button-subtle" type="submit">
                        Rimuovi
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
          {isOwner && (
            <>
              <div className="divider" />
              <div>
                <h3>Rinomina gruppo</h3>
                <RenameGroupForm conversationId={conversationId} currentName={conversation.name} />
              </div>
              <div className="divider" />
              <div>
                <h3>Aggiungi persone</h3>
                <AddGroupMembersForm
                  conversationId={conversationId}
                  addableFriends={addableFriends}
                />
              </div>
            </>
          )}
        </div>
      </details>
      <section className="card card-body stack">
        {nextCursor && (
          <Link
            href={`/messaggi/gruppo/${conversationId}?cursor=${encodeURIComponent(nextCursor)}`}
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
