import { getRelationship } from "@/features/friends/queries";
import {
  blockUserAction,
  cancelFriendRequestAction,
  removeFriendshipAction,
  respondToFriendRequestAction,
} from "@/features/friends/actions";
import { SendFriendRequestForm } from "./send-friend-request-form";

export async function FriendshipActions({
  viewerId,
  username,
}: {
  viewerId: string;
  username: string;
}) {
  const relationship = await getRelationship(viewerId, username);
  if (relationship.kind === "self") return null;
  return (
    <div className="button-row">
      {relationship.kind === "none" && (
        <SendFriendRequestForm username={username} />
      )}
      {relationship.kind === "pending_outgoing" && (
        <form action={cancelFriendRequestAction}>
          <input type="hidden" name="requestId" value={relationship.requestId} />
          <button className="button" type="submit">
            Annulla richiesta
          </button>
        </form>
      )}
      {relationship.kind === "pending_incoming" && (
        <>
          <form action={respondToFriendRequestAction}>
            <input type="hidden" name="requestId" value={relationship.requestId} />
            <input type="hidden" name="accept" value="true" />
            <button className="button button-primary" type="submit">
              Accetta richiesta
            </button>
          </form>
          <form action={respondToFriendRequestAction}>
            <input type="hidden" name="requestId" value={relationship.requestId} />
            <input type="hidden" name="accept" value="false" />
            <button className="button" type="submit">
              Rifiuta
            </button>
          </form>
        </>
      )}
      {relationship.kind === "friends" && (
        <form action={removeFriendshipAction}>
          <input type="hidden" name="username" value={username} />
          <button className="button" type="submit">
            Rimuovi amicizia
          </button>
        </form>
      )}
      <form action={blockUserAction}>
        <input type="hidden" name="username" value={username} />
        <button className="button button-danger" type="submit">
          Blocca
        </button>
      </form>
    </div>
  );
}
