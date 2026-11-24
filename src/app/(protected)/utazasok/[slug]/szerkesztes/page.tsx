import type { Metadata } from "next";
import Link from "next/link";
import { PageContent } from "@/components/layout/page-content";
import { TripForm } from "@/components/trips/trip-form";
import { loadServerTrip } from "@/lib/server-trip";

export const metadata: Metadata = { title: "Utazás szerkesztése" };

export default async function EditTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await loadServerTrip(slug);

  return <PageContent>
    <header>
      <Link href="/utazasok" prefetch={false} className="text-xs font-medium text-muted-foreground hover:text-brand hover:underline">Vissza az utazásokhoz</Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Utazás szerkesztése</h1>
    </header>
    {trip ? <TripForm key={trip.slug} trip={trip} /> : <p role="status" className="rounded-xl border border-border bg-surface p-4 text-sm">
      Az utazás betöltése nem sikerült. Frissítsd az oldalt az újbóli próbálkozáshoz.
    </p>}
  </PageContent>;
}
