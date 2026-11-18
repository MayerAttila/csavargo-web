import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlineArrowLeft, HiOutlineCalendarDays, HiOutlineMapPin } from "react-icons/hi2";
import { ManageTripInvitations } from "@/components/trips/manage-trip-invitations";
import { TripCardCover } from "@/components/trips/trip-card-cover";
import { calendarDay, tripDateLabel } from "@/components/trips/trip-calendar";
import { loadServerTrip } from "@/lib/server-trip";
import { requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Útitárs meghívása" };

export default async function TripInvitationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ user }, trip] = await Promise.all([requireServerMe(), loadServerTrip(slug)]);
  return <section className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
    <Link href={`/utazasok/${encodeURIComponent(slug)}`} prefetch={false}
      className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand">
      <HiOutlineArrowLeft aria-hidden="true" className="size-4" /> Vissza az útitervhez
    </Link>
    <header className="grid overflow-hidden rounded-2xl border border-border bg-linear-to-br from-brand/12 via-surface to-surface shadow-sm md:grid-cols-2">
      <div className="min-w-0 p-5 sm:p-7 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Útitárs meghívása</h1>
        {trip && <div className="mt-4 min-w-0 space-y-2">
          <p className="wrap-break-word text-lg font-semibold">{trip.name}</p>
          {trip.name !== trip.plan.destination.label && <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <HiOutlineMapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{trip.plan.destination.label}
          </p>}
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <HiOutlineCalendarDays aria-hidden="true" className="size-4 shrink-0" />
            <span>{tripDateLabel(calendarDay(trip.plan.start), true)}
              {trip.plan.start !== trip.plan.end && ` – ${tripDateLabel(calendarDay(trip.plan.end), true)}`}</span>
          </p>
        </div>}
      </div>
      {trip && <TripCardCover slug={slug} className="h-36 border-t border-border md:h-full md:min-h-48 md:border-t-0 md:border-l" />}
    </header>
    <ManageTripInvitations slug={slug} userId={user.id} />
  </section>;
}
