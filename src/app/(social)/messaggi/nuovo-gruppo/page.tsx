import { requireUser } from "@/server/authorization/session";
import { listFriends } from "@/features/friends/queries";
import { GroupComposer } from "@/features/messages/components/group-composer";

export const metadata = { title: "Nuovo gruppo" };

export default async function NewGroupPage() {
  const user = await requireUser();
  // ponytail: first page of friends only, no picker pagination — add if an
  // account with hundreds of friends actually needs it.
  const { friends } = await listFriends(user.id);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">NUOVA CONVERSAZIONE</p>
          <h1>Crea un gruppo.</h1>
        </div>
      </div>
      <section className="card card-body">
        {friends.length < 2 ? (
          <p className="muted">
            Serve almeno un paio di amici per creare un gruppo. Fanne amicizia
            prima da Persone.
          </p>
        ) : (
          <GroupComposer friends={friends} />
        )}
      </section>
    </>
  );
}
