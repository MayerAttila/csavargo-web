import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripPlanner } from "@/components/trips/trip-planner";
import { tripApiPath, type SavedTripPlan } from "@/lib/api";
import { requestServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Kirándulástervező" };

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireServerMe();
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) notFound();

  let response: Response | undefined;
  try {
    response = await requestServerApi(tripApiPath(slug));
  } catch {
    // The planner can retry an unavailable backend without discarding edits.
  }
  if (response?.status === 404) notFound();
  let saved: SavedTripPlan | null = null;
  if (response?.ok) {
    try { saved = await response.json(); } catch { /* Allow retry after an unreadable response. */ }
  }
  return <TripPlanner key={slug} slug={slug} initialSaved={saved} />;
}
