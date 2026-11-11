import { requireServerMe } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireServerMe();
  return <>{children}</>;
}
