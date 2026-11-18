"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlineCheck,
  HiOutlineMapPin, HiOutlinePencil, HiOutlinePlus,
} from "react-icons/hi2";
import type { TripSummary } from "@/lib/api";
import { TripCardCover } from "./trip-card-cover";
import { calendarDay } from "./trip-calendar";

const statuses = {
  planning: { label: "Tervezés alatt", Icon: HiOutlinePencil, color: "bg-violet-200 text-violet-950" },
  upcoming: { label: "Közelgő", Icon: HiOutlineCalendarDays, color: "bg-sky-200 text-sky-950" },
  past: { label: "Korábbi", Icon: HiOutlineCheck, color: "bg-emerald-200 text-emerald-950" },
};
type TripStatus = keyof typeof statuses;
type TripFilter = "all" | TripStatus;

const upcomingDays = 14;
const filters: TripFilter[] = ["all", "planning", "upcoming", "past"];
const dateFormat = new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeZone: "UTC" });
const createClass = "inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function tripStatus(trip: TripSummary, today: string): TripStatus {
  if (trip.end < today) return "past";
  if (calendarDay(trip.start) - calendarDay(today) <= upcomingDays) return "upcoming";
  return "planning";
}

function TripCard({ trip, status, inProgress }: { trip: TripSummary; status: TripStatus; inProgress: boolean }) {
  const { slug, name, destination, start, end, stopCount } = trip;
  const { label, Icon, color } = statuses[status];
  const duration = calendarDay(end) - calendarDay(start) + 1;
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));
  return <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-colors hover:border-brand/70 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
    <TripCardCover slug={slug}>
      <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${color}`}>
        <Icon aria-hidden="true" className="size-4" />
        {inProgress ? "Folyamatban" : label}
      </span>
      <Link href={`/utazasok/${encodeURIComponent(slug)}/szerkesztes`} prefetch={false}
        aria-label={`Utazás szerkesztése: ${name}`} title="Utazás szerkesztése"
        className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <HiOutlinePencil aria-hidden="true" className="size-4" />
      </Link>
    </TripCardCover>
    <Link
      href={`/utazasok/${encodeURIComponent(slug)}`}
      prefetch={false}
      className="flex flex-1 flex-col p-4 before:absolute before:inset-0 before:content-[''] focus-visible:outline-none"
    >
      <h2 className="wrap-break-word text-lg font-bold tracking-tight">{name}</h2>
      {destination !== name && <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{destination}</p>}
      <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
        <HiOutlineCalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <time dateTime={start}>{formatDate(start)}</time>
          {start !== end && <> – <time dateTime={end}>{formatDate(end)}</time></>}
        </span>
      </p>
      <div className="mt-auto pt-4">
        <div className="flex gap-2 divide-x divide-border border-y border-border/70 py-3 text-sm font-medium">
          <span className="flex flex-1 items-center justify-center gap-1.5 pr-2">
            <HiOutlineCalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {duration} nap
          </span>
          <span className="flex flex-1 items-center justify-center gap-1.5">
            <HiOutlineMapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {stopCount} program
          </span>
        </div>
        <span className={`mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-center text-sm font-semibold transition-colors ${
          status === "upcoming" ? "border-transparent bg-action text-white group-hover:bg-action-hover" : "border-border group-hover:border-brand"
        }`}>
          {status === "planning" ? <>
            <HiOutlinePencil aria-hidden="true" className="size-4 shrink-0" /> Tervezés folytatása
          </> : <>
            Megnyitás <HiOutlineArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </>}
        </span>
      </div>
    </Link>
  </article>;
}

export function TripOverview({ trips, today }: { trips: TripSummary[] | null; today: string }) {
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
          <TripCard trip={trip} status={status} inProgress={trip.start <= today && today <= trip.end} />
        </li>)}
      </ul> : <p role="status" className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        Nincs ilyen állapotú utazás.
      </p>}
    </>}
  </section>;
}
