import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TripPlanner } from "@/components/trips/trip-planner";
import { requestServerApi, requireServerMe } from "@/lib/server-session";
import { sharedTripApiPath, type SharedTrip } from "@/lib/trip-invitations-api";

export const metadata: Metadata = { title: "Megosztott útiterv" };

async function loadSharedTrip(id: string): Promise<SharedTrip | null> {
  let response: Response;
  try {
    response = await requestServerApi(sharedTripApiPath(id));
  } catch {
    return null;
  }
  if (response.status === 404) notFound();
  return response.ok ? response.json() : null;
}

export default async function SharedTripPage({ params }: { params: Promise<{ id: string }> }) {
  await requireServerMe();
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const trip = await loadSharedTrip(id);

  if (trip) return <TripPlanner key={id} initialSaved={trip} sharedBy={trip.owner} />;

  return <section className="mx-auto max-w-3xl space-y-4">
    <Link href="/utazasok" prefetch={false} className="text-sm text-brand hover:underline">Vissza az utazásokhoz</Link>
    <h1 className="text-3xl font-bold tracking-tight">Megosztott útiterv</h1>
    <p role="status">Az útiterv betöltése nem sikerült. Frissítsd az oldalt az újbóli próbálkozáshoz.</p>
  </section>;
}
