import type { Metadata } from "next";
import { Companions } from "@/components/companions/companions";
import type { TripSummary } from "@/lib/api";
import type { TripInvitations } from "@/lib/trip-invitations-api";
import { loadServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Útitársak" };

export default async function CompanionsPage() {
  const { user } = await requireServerMe();
  const [trips, invitations] = await Promise.all([
    loadServerApi<TripSummary[]>("/api/trips"),
    loadServerApi<TripInvitations>("/api/trip-invitations"),
  ]);
  const sharedTripCount = trips && invitations
    ? trips.filter(({ companionCount }) => companionCount > 0).length + invitations.filter(({ accepted }) => accepted).length
    : null;
  return <Companions key={user.id} userId={user.id} sharedTripCount={sharedTripCount} />;
}
