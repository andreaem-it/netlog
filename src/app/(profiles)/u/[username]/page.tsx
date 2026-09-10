import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/server/authorization/session";
import { getProfile } from "@/features/profiles/queries";
import { ProfileCard } from "@/features/profiles/components/profile-card";
import { FriendshipActions } from "@/features/friends/components/friendship-actions";
import { AppShell } from "@/components/layout/app-shell";
import { Brand } from "@/components/ui/brand";
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
        <FriendshipActions viewerId={user.id} username={profile.username} />
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
