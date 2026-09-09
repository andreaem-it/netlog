import { requireUser } from "@/server/authorization/session";
import { getProfile } from "@/features/profiles/queries";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import Link from "next/link";
export const metadata = { title: "Impostazioni" };
export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.profile?.username ?? "", user.id);
  if (!profile) throw new Error("Profile missing.");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">A MODO TUO</p>
          <h1>Il tuo profilo.</h1>
          <p className="muted">Scegli come raccontarti e cosa condividere.</p>
        </div>
      </div>
      <div className="settings-layout">
        <section className="card card-body">
          <ProfileForm profile={profile} />
        </section>
        <aside className="settings-note">
          <h2>Il tuo indirizzo personale</h2>
          <p>@{profile.username}</p>
          <p>
            Lo username identifica il tuo profilo e per ora non è modificabile.
          </p>
          <div className="divider" />
          <h2>Il tuo account</h2>
          <p>{user.email}</p>
          <Link href="/forgot-password" className="text-link">
            Reimposta la password
          </Link>
          <div className="divider" />
          <p>Avatar e copertina personalizzati arriveranno presto.</p>
        </aside>
      </div>
    </>
  );
}
