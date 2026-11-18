import type { paths } from "@/generated/api";

export type Me = paths["/api/me"]["get"]["responses"][200]["content"]["application/json"];
export const meKey = ["me"] as const;
export type SavedTripPlan = paths["/api/trips/{slug}"]["get"]["responses"][200]["content"]["application/json"];
export type TripPlan = SavedTripPlan["plan"];
export type TripSummary = paths["/api/trips"]["get"]["responses"][200]["content"]["application/json"][number];
type TripCoverResponse = paths["/api/trips/{slug}/cover"]["get"]["responses"][200]["content"]["application/json"];
export type CreateTrip = paths["/api/trips"]["post"]["requestBody"]["content"]["application/json"];

export function tripApiPath(slug: string) {
  return `/api/trips/${encodeURIComponent(slug)}`;
}

export async function getTripCover(slug: string, signal: AbortSignal): Promise<TripCoverResponse["cover"]> {
  const response = await fetch(`${tripApiPath(slug)}/cover`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("TRIP_COVER_UNAVAILABLE");
  const result: TripCoverResponse = await response.json();
  return result.cover;
}

export async function getTripPlan(slug: string): Promise<SavedTripPlan> {
  const response = await fetch(tripApiPath(slug), { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("TRIP_UNAVAILABLE");
  return response.json();
}

export async function createTrip(trip: CreateTrip): Promise<SavedTripPlan> {
  const response = await fetch("/api/trips", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "content-type": "application/json" }, body: JSON.stringify(trip),
  });
  if (!response.ok) throw new Error("TRIP_UNAVAILABLE");
  return response.json();
}

export async function saveTripPlan(slug: string, plan: TripPlan, version: number, name: string): Promise<SavedTripPlan> {
  const response = await fetch(tripApiPath(slug), {
    method: "PUT", credentials: "same-origin", cache: "no-store",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, version, name }),
  });
  if (response.status === 409) throw new Error("TRIP_CONFLICT");
  if (!response.ok) throw new Error("TRIP_UNAVAILABLE");
  return response.json();
}

export async function getMe(): Promise<Me> {
  const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "UNAUTHORIZED" : "API_UNAVAILABLE");
  return response.json();
}
