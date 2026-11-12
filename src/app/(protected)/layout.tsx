import { requireServerMe } from "@/lib/server-session";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const me = await requireServerMe();
  return <AppShell initialMe={me}>{children}</AppShell>;
}
