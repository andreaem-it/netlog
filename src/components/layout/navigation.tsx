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
  ShieldAlert,
} from "lucide-react";

export function Navigation({
  username,
  isAdmin,
}: {
  username: string;
  isAdmin?: boolean;
}) {
  const path = usePathname();
  return (
    <nav aria-label="Navigazione principale">
      {[
        { label: "Home", href: "/home", icon: House },
        { label: "Persone", href: "/persone", icon: Users },
        { label: "Amici", href: "/amici", icon: HeartHandshake },
        { label: "Messaggi", href: "/messaggi", icon: MessageCircle },
        { label: "Notifiche", href: "/notifiche", icon: Bell },
        { label: "Il mio profilo", href: `/u/${username}`, icon: UserRound },
        { label: "Impostazioni", href: "/settings", icon: Settings2 },
        ...(isAdmin
          ? [{ label: "Moderazione", href: "/moderazione", icon: ShieldAlert }]
          : []),
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
