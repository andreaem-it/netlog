import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Pencil,
  Globe2,
  LockKeyhole,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { brand } from "@/config/brand";

export function ProfileCard({
  profile,
}: {
  profile: {
    name: string;
    username: string;
    bio: string;
    city: string | null;
    joinedAt: Date;
    visibility: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    owner: boolean;
  };
}) {
  return (
    <section className="card" aria-label={`Profilo di ${profile.name}`}>
      <div className="profile-cover">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere.
          <img
            src={profile.coverUrl}
            alt=""
            className="profile-cover-image"
          />
        ) : (
          <>
            <span className="cover-label">UNO SPAZIO PER ESSERE TE</span>
            <span className="cover-word" aria-hidden="true">
              {brand.shortName.toLowerCase()}.
            </span>
          </>
        )}
      </div>
      <div className="profile-content">
        <div className="profile-topline">
          <Avatar name={profile.name} src={profile.avatarUrl} large />
          {profile.owner && (
            <Link href="/settings" className="button">
              <Pencil size={15} />
              Modifica profilo
            </Link>
          )}
        </div>
        <h2 className="profile-name">{profile.name}</h2>
        <p className="handle">@{profile.username}</p>
        <p className={`profile-bio${!profile.bio ? " muted" : ""}`}>
          {profile.bio ||
            (profile.owner
              ? "La tua storia comincia qui. Aggiungi una bio per raccontarti."
              : "Questa persona non ha ancora aggiunto una bio.")}
        </p>
        <div className="profile-meta">
          {profile.city && (
            <span>
              <MapPin size={15} />
              {profile.city}
            </span>
          )}
          <span>
            <CalendarDays size={15} />
            Qui da{" "}
            {new Intl.DateTimeFormat("it-IT", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(profile.joinedAt)}
          </span>
          <span>
            {profile.visibility === "PUBLIC" ? (
              <Globe2 size={15} />
            ) : (
              <LockKeyhole size={15} />
            )}
            {profile.visibility === "PUBLIC"
              ? "Profilo pubblico"
              : profile.visibility === "FRIENDS"
                ? "Solo amici"
                : "Profilo privato"}
          </span>
        </div>
      </div>
    </section>
  );
}
