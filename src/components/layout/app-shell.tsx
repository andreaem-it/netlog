import Link from "next/link";
import { LogOut } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { Avatar } from "@/components/ui/avatar";
import { Navigation } from "./navigation";
import { logoutAction } from "@/features/auth/actions";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; username: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="app-header">
        <Brand />
        <span className="header-caption">Il tuo spazio. Le tue persone.</span>
        <div className="header-right">
          <Link className="profile-link" href={`/u/${user.username}`}>
            <Avatar name={user.name} />
            <span>{user.name}</span>
          </Link>
          <form action={logoutAction}>
            <button className="logout" aria-label="Esci dal tuo account">
              <LogOut size={18} />
              <span>Esci</span>
            </button>
          </form>
        </div>
      </header>
      <div className="app-grid">
        <aside className="sidebar">
          <Navigation username={user.username} />
          <div className="sidebar-note">
            <strong>Un piccolo nuovo inizio.</strong>Uno spazio che cresce,
            <br />
            una persona alla volta.
          </div>
        </aside>
        <main id="main" className="app-main">
          {children}
        </main>
      </div>
    </>
  );
}
