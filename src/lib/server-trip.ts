import "server-only";
import { notFound } from "next/navigation";
import { tripApiPath, type SavedTripPlan } from "./api";
import { requestServerApi, requireServerMe } from "./server-session";

export async function loadServerTrip(slug: string): Promise<SavedTripPlan | null> {
  await requireServerMe();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) notFound();
  let response: Response;
  try {
    response = await requestServerApi(tripApiPath(slug));
  } catch {
    return null;
  }
  if (response.status === 404) notFound();
  try {
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
