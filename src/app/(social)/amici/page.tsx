import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import {
  listBlockedUsers,
  listFriends,
  listPendingRequests,
} from "@/features/friends/queries";
import {
  cancelFriendRequestAction,
  removeFriendshipAction,
  respondToFriendRequestAction,
  unblockUserAction,
} from "@/features/friends/actions";

export const metadata = { title: "Amici" };

export default async function AmiciPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const user = await requireUser();
  const [{ friends, nextCursor }, { incoming, outgoing }, blocked] =
    await Promise.all([
      listFriends(user.id, cursor),
      listPendingRequests(user.id),
      listBlockedUsers(user.id),
    ]);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">LE TUE PERSONE</p>
          <h1>Amici e richieste.</h1>
        </div>
      </div>

      {incoming.length > 0 && (
        <section className="card">
          <div className="card-body stack">
            <h2>Richieste ricevute</h2>
            {incoming.map((request) => (
              <div key={request.requestId} className="button-row">
                <Link href={`/u/${request.username}`}>
                  {request.name} · @{request.username}
                </Link>
                <form action={respondToFriendRequestAction}>
                  <input type="hidden" name="requestId" value={request.requestId} />
                  <input type="hidden" name="accept" value="true" />
                  <button className="button button-primary" type="submit">
                    Accetta
                  </button>
                </form>
                <form action={respondToFriendRequestAction}>
                  <input type="hidden" name="requestId" value={request.requestId} />
                  <input type="hidden" name="accept" value="false" />
                  <button className="button" type="submit">
                    Rifiuta
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="card">
          <div className="card-body stack">
            <h2>Richieste inviate</h2>
            {outgoing.map((request) => (
              <div key={request.requestId} className="button-row">
                <Link href={`/u/${request.username}`}>
                  {request.name} · @{request.username}
                </Link>
                <form action={cancelFriendRequestAction}>
                  <input type="hidden" name="requestId" value={request.requestId} />
                  <button className="button" type="submit">
                    Annulla
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-body stack">
          <h2>I tuoi amici</h2>
          {friends.length === 0 && (
            <p className="muted">Non hai ancora nessun amico. Cerca qualcuno su Persone.</p>
          )}
          {friends.map((friend) => (
            <div key={friend.friendshipId} className="button-row">
              <Link href={`/u/${friend.username}`}>
                {friend.name} · @{friend.username}
              </Link>
              <form action={removeFriendshipAction}>
                <input type="hidden" name="username" value={friend.username} />
                <button className="button" type="submit">
                  Rimuovi amicizia
                </button>
              </form>
            </div>
          ))}
          {nextCursor && (
            <Link href={`/amici?cursor=${encodeURIComponent(nextCursor)}`} className="button">
              Carica altri
            </Link>
          )}
        </div>
      </section>

      {blocked.length > 0 && (
        <section className="card">
          <div className="card-body stack">
            <h2>Persone bloccate</h2>
            {blocked.map((person) => (
              <div key={person.userId} className="button-row">
                <span>
                  {person.name} · @{person.username}
                </span>
                <form action={unblockUserAction}>
                  <input type="hidden" name="username" value={person.username} />
                  <button className="button" type="submit">
                    Sblocca
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
