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
  const { profiles, nextCursor } = await searchProfiles({
    query,
    viewerId: user.id,
    cursor,
  });
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Scopri persone.</h1>
          <p className="muted">
            Esplora i profili pubblici oppure cerca per nome, username o città.
          </p>
        </div>
      </div>
      <form method="get" className="people-search">
        <label className="people-search-field">
          <span className="sr-only">Cerca persone</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Nome, @username o città"
            autoComplete="off"
          />
        </label>
        <button className="button button-primary" type="submit">
          <Search size={15} />
          Cerca
        </button>
      </form>
      {profiles.length === 0 ? (
        <div className="people-empty">
          <h2>{query ? "Nessun risultato" : "Qui è ancora tutto tranquillo"}</h2>
          <p className="muted">
            {query
              ? "Prova con un altro nome, username o città."
              : "I nuovi profili pubblici appariranno qui."}
          </p>
        </div>
      ) : (
        <section aria-label={query ? "Risultati della ricerca" : "Profili da scoprire"}>
          <div className="people-section-heading">
            <h2>{query ? `Risultati per “${query}”` : "Persone da conoscere"}</h2>
            <span className="muted">Profili pubblici</span>
          </div>
          <div className="people-grid">
            {profiles.map((profile) => (
              <Link
                key={profile.username}
                href={`/u/${profile.username}`}
                className="person-tile"
              >
                <Avatar name={profile.name} src={profile.avatarUrl} showcase />
                <span className="person-tile-copy">
                  <strong>{profile.name}</strong>
                  <span className="muted">@{profile.username}</span>
                  {profile.city && <span className="person-city">{profile.city}</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {nextCursor && (
        <Link
          href={`/persone?${query ? `q=${encodeURIComponent(query)}&` : ""}cursor=${encodeURIComponent(nextCursor)}`}
          className="button"
        >
          Carica altri
        </Link>
      )}
    </>
  );
}
