import type { Metadata } from "next";
import { TripOverview } from "@/components/trips/trip-overview";
import { currentTripDate } from "@/components/trips/trip-calendar";
import type { TripSummary } from "@/lib/api";
import { loadServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Utazások" };

export default async function TripsPage() {
  const { user } = await requireServerMe();
  const trips = await loadServerApi<TripSummary[]>("/api/trips");

  return <TripOverview trips={trips} today={currentTripDate()} userId={user.id} />;
}
