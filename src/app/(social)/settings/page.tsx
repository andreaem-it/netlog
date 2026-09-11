import { requireUser } from "@/server/authorization/session";
import { getOwnProfile } from "@/features/profiles/queries";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { MediaUploader } from "@/features/profiles/components/media-uploader";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form";
import { PushSubscribeButton } from "@/features/push/components/push-subscribe-button";
import { getVapidKeys } from "@/config/env";
import Link from "next/link";
export const metadata = { title: "Impostazioni" };
export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.id);
  if (!profile) throw new Error("Profile missing.");
  const vapidKeys = getVapidKeys();
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
          {user.emailVerified ? (
            <p className="muted">Email verificata.</p>
          ) : (
            <>
              <p className="muted">Email non ancora verificata.</p>
              <ResendVerificationButton />
            </>
          )}
          <Link href="/forgot-password" className="text-link">
            Reimposta la password
          </Link>
          <div className="divider" />
          <h2>Foto del profilo</h2>
          <p className="muted">JPEG, PNG o WebP, fino a 5&nbsp;MB.</p>
          <div className="button-row">
            <MediaUploader
              kind="avatar"
              label="Cambia avatar"
              currentUrl={profile.avatarUrl}
            />
            <MediaUploader
              kind="cover"
              label="Cambia copertina"
              currentUrl={profile.coverUrl}
            />
          </div>
          {vapidKeys && (
            <>
              <div className="divider" />
              <h2>Notifiche push</h2>
              <p className="muted">
                Ricevi un avviso sul dispositivo per messaggi, richieste di
                amicizia e altre novità.
              </p>
              <PushSubscribeButton publicKey={vapidKeys.publicKey} />
            </>
          )}
          <div className="divider" />
          <h2>Zona pericolosa</h2>
          <DeleteAccountForm />
        </aside>
      </div>
    </>
  );
}
