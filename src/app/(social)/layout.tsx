import { requireUser } from "@/server/authorization/session";
import { AppShell } from "@/components/layout/app-shell";
export default async function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <AppShell
      user={{
        name: user.name,
        username: user.profile?.username ?? "",
        avatarUrl: user.profile?.avatar?.storageKey ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
