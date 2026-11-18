import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlineMapPin, HiOutlinePlus } from "react-icons/hi2";
import type { TripSummary } from "@/lib/api";
import { requestServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Utazások" };
const dateFormat = new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeZone: "UTC" });
const createClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

async function loadTrips(): Promise<TripSummary[] | null> {
  try {
    const response = await requestServerApi("/api/trips");
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

function dateRange(start: string, end: string) {
  const first = dateFormat.format(new Date(`${start}T00:00:00Z`));
  return start === end ? first : `${first} – ${dateFormat.format(new Date(`${end}T00:00:00Z`))}`;
}

export default async function TripsPage() {
  await requireServerMe();
  const trips = await loadTrips();

  return <section className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Utazások</h1>
      {Boolean(trips?.length) && <Link href="/utazasok/uj" className={createClass}>
        <HiOutlinePlus aria-hidden="true" className="size-4" /> Utazás létrehozása
      </Link>}
    </header>
    {trips === null ? <p role="status" className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
      Az utazások betöltése nem sikerült. Próbáld újra az oldal frissítésével.
    </p> : trips.length === 0 ? <div className="grid justify-items-center gap-3 rounded-2xl border border-border/80 bg-surface px-4 py-12 text-center">
      <HiOutlineMapPin aria-hidden="true" className="size-8 text-brand" />
      <p className="text-sm text-muted-foreground">Még nincs mentett utazásod.</p>
      <Link href="/utazasok/uj" className={createClass}><HiOutlinePlus aria-hidden="true" className="size-4" /> Utazás létrehozása</Link>
    </div> : <ul aria-label="Mentett utazások" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {trips.map(({ slug, name, destination, start, end }) => <li key={slug} className="min-w-0">
        <Link href={`/utazasok/${encodeURIComponent(slug)}`} prefetch={false} className="group block h-full space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm hover:border-brand/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 wrap-break-word font-semibold tracking-tight">{name}</h2>
            <HiOutlineArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
          </div>
          {destination !== name && <p className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
            <HiOutlineMapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 wrap-break-word">{destination}</span>
          </p>}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <HiOutlineCalendarDays aria-hidden="true" className="size-4 shrink-0" />{dateRange(start, end)}
          </p>
        </Link>
      </li>)}
    </ul>}
  </section>;
}
