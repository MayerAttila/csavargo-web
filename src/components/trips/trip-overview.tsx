"use client";

import Link from "next/link";
import { useState } from "react";
import { HiOutlineMapPin, HiOutlinePlus } from "react-icons/hi2";
import type { TripSummary } from "@/lib/api";
import { TripCard, tripStatus, statuses, type TripStatus } from "./trip-card";
import { TripInvitationsInbox } from "./trip-invitations-inbox";

type TripFilter = "all" | TripStatus;

const filters: TripFilter[] = ["all", "planning", "upcoming", "past"];
const createClass = "inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function TripOverview({ trips, today, userId }: { trips: TripSummary[] | null; today: string; userId: string }) {
  const [filter, setFilter] = useState<TripFilter>("all");
  const entries = trips?.map((trip) => ({ trip, status: tripStatus(trip, today) })) ?? [];
  const counts = { all: entries.length, planning: 0, upcoming: 0, past: 0 };
  for (const { status } of entries) counts[status] += 1;
  const visible = entries.filter(({ status }) => filter === "all" || status === filter);

  return <section className="mx-auto max-w-[96rem] space-y-6 pt-2 sm:pt-5 lg:px-4">
    <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Utazások</h1>
      <Link href="/utazasok/uj" className={createClass}>
        <HiOutlinePlus aria-hidden="true" className="size-5" /> Utazás létrehozása
      </Link>
    </header>
    <TripInvitationsInbox userId={userId} today={today} />
    {trips === null ? <p role="status" className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
      Az utazások betöltése nem sikerült. Próbáld újra az oldal frissítésével.
    </p> : entries.length === 0 ? <div className="grid justify-items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-12 text-center">
      <HiOutlineMapPin aria-hidden="true" className="size-8 text-brand" />
      <p className="text-sm text-muted-foreground">Még nincs mentett utazásod.</p>
    </div> : <>
      <div role="group" aria-label="Utazások szűrése" className="flex flex-wrap gap-1.5 border-b border-border pb-3 sm:gap-3">
        {filters.map((value) => <button
          key={value}
          type="button"
          aria-pressed={filter === value}
          onClick={() => setFilter(value)}
          className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-4 ${
            filter === value ? "bg-brand/15 text-blue-800 dark:text-blue-300" : "text-muted-foreground hover:bg-surface-alt hover:text-foreground"
          }`}
        >
          {value === "all" ? "Összes utazás" : statuses[value].label}
          <span className={`min-w-5 rounded-full px-1.5 text-center text-xs leading-5 tabular-nums ${filter === value ? "bg-brand/15" : "bg-surface-alt"}`}>{counts[value]}</span>
        </button>)}
      </div>
      {visible.length ? <ul aria-label="Mentett utazások" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1420px]:grid-cols-4 xl:gap-5">
        {visible.map(({ trip, status }) => <li key={trip.slug} className="min-w-0">
          <TripCard trip={trip} slug={trip.slug} userId={userId} status={status} inProgress={trip.start <= today && today <= trip.end} />
        </li>)}
      </ul> : <p role="status" className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        Nincs ilyen állapotú utazás.
      </p>}
    </>}
  </section>;
}
