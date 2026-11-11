import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/server-session";
import { Dashboard } from "@/components/auth/dashboard";

export const dynamic = "force-dynamic";
export default async function Overview() {
  const me = await getServerMe();
  if (!me) redirect("/belepes");
  return <Dashboard initialMe={me} />;
}
