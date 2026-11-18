import type { Metadata } from "next";
import { TripOverview } from "@/components/trips/trip-overview";
import type { TripSummary } from "@/lib/api";
import { requestServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Utazások" };
const localDate = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Budapest" });

async function loadTrips(): Promise<TripSummary[] | null> {
  try {
    const response = await requestServerApi("/api/trips");
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export default async function TripsPage() {
  const { user } = await requireServerMe();
  const trips = await loadTrips();

  return <TripOverview trips={trips} today={localDate.format(new Date())} userId={user.id} />;
}
