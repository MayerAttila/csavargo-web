import type { Metadata } from "next";
import { Companions } from "@/components/companions/companions";
import { requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Útitársak" };

export default async function CompanionsPage() {
  const { user } = await requireServerMe();
  return <Companions key={user.id} userId={user.id} />;
}
