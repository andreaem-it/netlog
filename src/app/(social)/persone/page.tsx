import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser } from "@/server/authorization/session";
import { searchProfiles } from "@/features/profiles/queries";
import { Avatar } from "@/components/ui/avatar";

export const metadata = { title: "Persone" };

export default async function PersonePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const { q, cursor } = await searchParams;
  const user = await requireUser();
  const query = q?.trim() ?? "";
  const { profiles, nextCursor } = query
    ? await searchProfiles({ query, viewerId: user.id, cursor })
    : { profiles: [], nextCursor: null };
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">LE PERSONE, PRIMA DI TUTTO</p>
          <h1>Trova qualcuno.</h1>
          <p className="muted">Cerca per nome o username tra i profili pubblici.</p>
        </div>
      </div>
      <form method="get" className="form-stack" style={{ maxWidth: 420 }}>
        <label>
          Cerca
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Nome o @username"
            autoComplete="off"
          />
        </label>
        <button className="button button-primary" type="submit">
          <Search size={15} />
          Cerca
        </button>
      </form>
      {query && profiles.length === 0 && (
        <p className="muted">Nessun profilo pubblico corrisponde a questa ricerca.</p>
      )}
      {profiles.length > 0 && (
        <section className="card">
          <div className="card-body stack">
            {profiles.map((profile) => (
              <Link
                key={profile.username}
                href={`/u/${profile.username}`}
                className="nav-item"
                style={{ height: "auto", padding: "0.75rem 0" }}
              >
                <Avatar name={profile.name} />
                <span>
                  <strong>{profile.name}</strong>
                  <br />
                  <span className="muted">@{profile.username}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {nextCursor && (
        <Link
          href={`/persone?q=${encodeURIComponent(query)}&cursor=${encodeURIComponent(nextCursor)}`}
          className="button"
        >
          Carica altri
        </Link>
      )}
    </>
  );
}
