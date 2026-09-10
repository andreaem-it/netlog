import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/server/authorization/session";
import { getProfile } from "@/features/profiles/queries";
import { ProfileCard } from "@/features/profiles/components/profile-card";
import { FriendshipActions } from "@/features/friends/components/friendship-actions";
import { recordProfileView } from "@/features/visits/service";
import { listVisitors } from "@/features/visits/queries";
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
