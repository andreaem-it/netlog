"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Users,
  HeartHandshake,
  MessageCircle,
  Bell,
  UserRound,
  Settings2,
} from "lucide-react";

export function Navigation({ username }: { username: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Navigazione principale">
      {[
        { label: "Home", href: "/home", icon: House },
        { label: "Persone", icon: Users },
        { label: "Amici", icon: HeartHandshake },
        { label: "Messaggi", icon: MessageCircle },
        { label: "Notifiche", icon: Bell },
        { label: "Il mio profilo", href: `/u/${username}`, icon: UserRound },
        { label: "Impostazioni", href: "/settings", icon: Settings2 },
      ].map(({ label, href, icon: Icon }) =>
        href ? (
          <Link
            key={label}
            href={href}
            className={`nav-item${path === href ? " active" : ""}`}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={19} />
            {label}
          </Link>
        ) : (
          <span
            key={label}
            className="nav-item unavailable"
            aria-disabled="true"
          >
            <Icon size={19} />
            {label}
            <span className="nav-soon">Presto</span>
          </span>
        ),
      )}
    </nav>
  );
}
