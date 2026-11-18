import type { paths } from "@/generated/api";
import { tripApiPath } from "./api";

const base = "/api/trip-invitations";
export type TripInvitations = paths[typeof base]["get"]["responses"][200]["content"]["application/json"];
export type TripInviteOptions = paths["/api/trips/{slug}/invitations"]["get"]["responses"][200]["content"]["application/json"];
export type SharedTrip = paths["/api/trip-invitations/{id}"]["get"]["responses"][200]["content"]["application/json"];

export function sharedTripApiPath(id: string) {
  return `${base}/${encodeURIComponent(id)}`;
}

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  if (response.status === 429) throw new Error("Túl sok meghívás. Próbáld újra egy perc múlva.");
  if (!response.ok) throw new Error("A meghívást nem sikerült frissíteni. Próbáld újra.");
  return response;
}

export async function getTripInviteOptions(slug: string, signal: AbortSignal): Promise<TripInviteOptions> {
  return (await request(`${tripApiPath(slug)}/invitations`, { signal })).json();
}

export async function sendTripInvitation(slug: string, companionId: string) {
  await request(`${tripApiPath(slug)}/invitations`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companionId }),
  });
}

export async function listTripInvitations(signal: AbortSignal): Promise<TripInvitations> {
  return (await request(base, { signal })).json();
}

export async function getSharedTripCover(id: string, signal: AbortSignal) {
  const response = await request(`${sharedTripApiPath(id)}/cover`, { signal });
  const data: paths["/api/trip-invitations/{id}/cover"]["get"]["responses"][200]["content"]["application/json"] = await response.json();
  return data.cover;
}

export async function changeTripInvitation(id: string, action: "accept" | "remove") {
  const path = sharedTripApiPath(id);
  await request(action === "accept" ? `${path}/accept` : path, { method: action === "accept" ? "POST" : "DELETE" });
}
