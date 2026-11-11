import { requireServerMe } from "@/lib/server-session";
import { Dashboard } from "@/components/auth/dashboard";

export const dynamic = "force-dynamic";
export default async function Overview() {
  const me = await requireServerMe();
  return <Dashboard initialMe={me} />;
}
