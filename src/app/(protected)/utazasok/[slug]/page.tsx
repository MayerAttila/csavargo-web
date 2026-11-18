import type { Metadata } from "next";
import { TripPlanner } from "@/components/trips/trip-planner";
import { loadServerTrip } from "@/lib/server-trip";

export const metadata: Metadata = { title: "Kirándulástervező" };

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const saved = await loadServerTrip(slug);
  return <TripPlanner key={slug} slug={slug} initialSaved={saved} />;
}
