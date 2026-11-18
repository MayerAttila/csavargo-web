import type { paths } from "@/generated/api";

export type Me = paths["/api/me"]["get"]["responses"][200]["content"]["application/json"];
export const meKey = ["me"] as const;
export type SavedTripPlan = paths["/api/trip-plan"]["get"]["responses"][200]["content"]["application/json"];
export type TripPlan = NonNullable<SavedTripPlan["plan"]>;

export async function getTripPlan(): Promise<SavedTripPlan> {
  const response = await fetch("/api/trip-plan", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("TRIP_UNAVAILABLE");
  return response.json();
}

export async function saveTripPlan(plan: TripPlan, version: number): Promise<SavedTripPlan> {
  const response = await fetch("/api/trip-plan", {
    method: "PUT", credentials: "same-origin", cache: "no-store",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, version }),
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
