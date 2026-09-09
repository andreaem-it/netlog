import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/server/authorization/session";
import { getProfile } from "@/features/profiles/queries";
import { ProfileCard } from "@/features/profiles/components/profile-card";

export const metadata = { title: "Il tuo spazio" };
export default async function HomePage() {
  const user = await requireUser();
  const profile = await getProfile(user.profile?.username ?? "", user.id);
  if (!profile) throw new Error("Profile missing for active account.");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">IL TUO ANGOLO DI INTERNET</p>
          <h1>Ciao, {user.name.split(" ")[0]}.</h1>
          <p className="muted">Fai spazio a ciò che ti somiglia.</p>
        </div>
        <span className="pill">
          <Sparkles size={13} />
          Un nuovo inizio
        </span>
      </div>
      <div className="content-columns">
        <div className="stack">
          <ProfileCard profile={profile} />
          <section className="card">
            <div
              className="card-body section-heading"
              style={{ marginBottom: 0, paddingBottom: 0 }}
            >
              <h2>Dalle tue persone</h2>
              <span className="pill">In ordine di tempo</span>
            </div>
            <div className="empty-state">
              <span className="empty-icon">
                <MessageSquare size={23} />
              </span>
              <h2>Le storie belle hanno un inizio.</h2>
              <p>
                Qui troverai i post dei tuoi amici. La condivisione e le
                amicizie saranno disponibili presto.
              </p>
            </div>
          </section>
        </div>
        <aside className="stack">
          <section className="card welcome-card">
            <p className="eyebrow">BENVENUTO NEL TUO SPAZIO</p>
            <h2>
              Prima di tutto,
              <br />
              ci sei tu.
            </h2>
            <p>
              Una bio, la tua città, il nome con cui vuoi farti conoscere. Rendi
              questo profilo un po’ più tuo.
            </p>
            <Link className="text-link" href="/settings">
              Raccontati <ArrowUpRight size={17} />
            </Link>
          </section>
          <section className="card card-body">
            <h2>Un passo alla volta</h2>
            <ul className="checklist">
              <li>
                <CheckCircle2 size={18} />
                Crea il tuo profilo
              </li>
              <li className={!profile.bio ? "unfinished" : ""}>
                {profile.bio ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Circle size={18} />
                )}
                Scrivi qualcosa di te
              </li>
              <li className={!profile.city ? "unfinished" : ""}>
                {profile.city ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Circle size={18} />
                )}
                Aggiungi la tua città
              </li>
            </ul>
            <div className="divider" />
            <Link href={`/u/${profile.username}`} className="text-link">
              Visita il tuo profilo <ArrowUpRight size={16} />
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
