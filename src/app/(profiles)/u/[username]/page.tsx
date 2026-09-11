import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/server/authorization/session";
import { getProfile } from "@/features/profiles/queries";
import { ProfileCard } from "@/features/profiles/components/profile-card";
import { FriendshipActions } from "@/features/friends/components/friendship-actions";
import { recordProfileView } from "@/features/visits/service";
import { listVisitors } from "@/features/visits/queries";
import { listVisibleAlbums } from "@/features/albums/queries";
import { listVisibleBlogPosts } from "@/features/blog/queries";
import { AppShell } from "@/components/layout/app-shell";
import { Brand } from "@/components/ui/brand";
import { ReportButton } from "@/features/reports/components/report-button";
export const metadata = { title: "Profilo" };
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await currentUser();
  const profile = await getProfile(username, user?.id);
  if (!profile) notFound();
  if (user && !profile.owner)
    await recordProfileView(user.id, profile.username);
  const visitors = profile.owner ? await listVisitors(user!.id) : [];
  const albums = user ? await listVisibleAlbums(profile.username, user.id) : null;
  const blogPosts = user
    ? (await listVisibleBlogPosts(user.id, profile.username)).posts
    : [];
  const content = (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">LE PERSONE, PRIMA DI TUTTO</p>
          <h1>
            {profile.owner ? "Questo sei tu." : `Lo spazio di ${profile.name}.`}
          </h1>
        </div>
      </div>
      <ProfileCard profile={profile} />
      {user && !profile.owner && (
        <div className="button-row">
          <FriendshipActions viewerId={user.id} username={profile.username} />
          <Link href={`/messaggi/${profile.username}`} className="button">
            Manda un messaggio
          </Link>
          <ReportButton target="profile" username={profile.username} />
        </div>
      )}
      {profile.owner && albums && albums.length === 0 && (
        <section className="card card-body">
          <p className="muted">
            Non hai ancora album. <Link href="/album">Creane uno</Link>.
          </p>
        </section>
      )}
      {albums && albums.length > 0 && (
        <section className="card card-body stack">
          <div className="section-heading">
            <h2>Album</h2>
            {profile.owner && (
              <Link href="/album" className="text-link">
                Gestisci
              </Link>
            )}
          </div>
          <div
            className="content-columns"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
          >
            {albums.map((album) => (
              <Link key={album.id} href={`/album/${album.id}`} className="card stack" style={{ gap: 0 }}>
                {album.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere.
                  <img
                    src={album.coverUrl}
                    alt=""
                    style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: "16px 16px 0 0" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 100, background: "var(--soft)", borderRadius: "16px 16px 0 0" }} />
                )}
                <strong style={{ padding: 8 }}>{album.title}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
      {profile.owner && blogPosts.length === 0 && (
        <section className="card card-body">
          <p className="muted">
            Non hai ancora scritto nulla sul blog. <Link href="/blog/nuovo">Scrivi il primo post</Link>.
          </p>
        </section>
      )}
      {blogPosts.length > 0 && (
        <section className="card card-body stack">
          <div className="section-heading">
            <h2>Blog</h2>
            {profile.owner && (
              <Link href="/blog" className="text-link">
                Gestisci
              </Link>
            )}
          </div>
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <strong>{post.title}</strong>{" "}
              <span className="muted">
                ·{" "}
                {new Intl.DateTimeFormat("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(post.createdAt)}
              </span>
            </Link>
          ))}
        </section>
      )}
      {visitors.length > 0 && (
        <section className="card card-body stack">
          <h2>Chi ti ha visitato di recente</h2>
          {visitors.map((visitor) => (
            <Link key={visitor.username} href={`/u/${visitor.username}`}>
              {visitor.name} · @{visitor.username}
            </Link>
          ))}
        </section>
      )}
    </>
  );
  if (user?.profile)
    return (
      <AppShell user={{ name: user.name, username: user.profile.username }}>
        {content}
      </AppShell>
    );
  return (
    <>
      <header className="app-header">
        <Brand />
        <Link href="/login" className="button">
          Accedi
        </Link>
      </header>
      <main id="main" className="public-profile">
        {content}
      </main>
    </>
  );
}
