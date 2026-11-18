import type { Metadata } from "next";
import { TripPlanner } from "@/components/trips/trip-planner";
import type { SavedTripPlan } from "@/lib/api";
import { requestServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Utazások" };

export default async function TripsPage() {
  await requireServerMe();
  let saved: SavedTripPlan | null = null;
  try {
    const response = await requestServerApi("/api/trip-plan");
    if (response.ok) saved = await response.json();
  } catch {
    // Keep the workspace available if only the trip endpoint is unavailable.
  }
  return <TripPlanner initialSaved={saved} />;
}
