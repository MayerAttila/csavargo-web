import Link from "next/link";
import type { ReactNode } from "react";
import { HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlineCheck, HiOutlineMapPin, HiOutlinePencil, HiOutlineUser } from "react-icons/hi2";
import type { TripSummary } from "@/lib/api";
import { calendarDay } from "./trip-calendar";
import { TripCardCover } from "./trip-card-cover";
import { TripCompanionBadge } from "./trip-companion-badge";

export const statuses = {
  planning: { label: "Tervezés alatt", Icon: HiOutlinePencil, color: "bg-violet-200 text-violet-950" },
  upcoming: { label: "Közelgő", Icon: HiOutlineCalendarDays, color: "bg-sky-200 text-sky-950" },
  past: { label: "Korábbi", Icon: HiOutlineCheck, color: "bg-emerald-200 text-emerald-950" },
};
export type TripStatus = keyof typeof statuses;
const upcomingDays = 14;
const dateFormat = new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeZone: "UTC" });

export function tripStatus(trip: Pick<TripSummary, "start" | "end">, today: string): TripStatus {
  if (trip.end < today) return "past";
  if (calendarDay(trip.start) - calendarDay(today) <= upcomingDays) return "upcoming";
  return "planning";
}

type Props = {
  trip: Omit<TripSummary, "slug">;
  status: TripStatus;
  inProgress: boolean;
  footer?: ReactNode;
} & ({ slug: string; userId: string; sharedId?: never; owner?: never } | { slug?: never; userId?: never; sharedId: string; owner: string });

export function TripCard({ trip, slug, userId, sharedId, owner, status, inProgress, footer }: Props) {
  const { name, destination, start, end, stopCount, companionCount } = trip;
  const Heading = owner ? "h3" : "h2";
  const { label, Icon, color } = statuses[status];
  const duration = calendarDay(end) - calendarDay(start) + 1;
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));
  return <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-colors hover:border-brand/70 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
    <TripCardCover slug={slug} sharedId={sharedId}>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${color}`}>
          <Icon aria-hidden="true" className="size-4" />
          {inProgress ? "Folyamatban" : label}
        </span>
        {slug !== undefined ? <Link href={`/utazasok/${encodeURIComponent(slug)}/szerkesztes`} prefetch={false}
          aria-label={`Utazás szerkesztése: ${name}`} title="Utazás szerkesztése"
          className="pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <HiOutlinePencil aria-hidden="true" className="size-4" />
        </Link> : <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
          <HiOutlineUser aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate"><span className="sr-only">Szervező: </span>{owner}</span>
        </span>}
      </div>
    </TripCardCover>
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-2 p-4">
      <Link href={slug !== undefined ? `/utazasok/${encodeURIComponent(slug)}` : `/utazasok/megosztott/${sharedId}`} prefetch={false}
        className="col-span-full row-span-full grid min-w-0 grid-cols-subgrid grid-rows-subgrid before:absolute before:inset-0 before:content-[''] focus-visible:outline-none">
        <div className="col-start-1 row-start-1 min-w-0">
          <Heading className="wrap-break-word text-lg font-bold tracking-tight">{name}</Heading>
          {destination !== name && <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{destination}</p>}
          <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
            <HiOutlineCalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              <time dateTime={start}>{formatDate(start)}</time>
              {start !== end && <> – <time dateTime={end}>{formatDate(end)}</time></>}
            </span>
          </p>
        </div>
        {slug === undefined && <TripCompanionBadge count={companionCount} name={name} />}
        <div className="col-span-full row-start-2 mt-auto pt-4">
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
            {status === "planning" && !sharedId ? <>
              <HiOutlinePencil aria-hidden="true" className="size-4 shrink-0" /> Tervezés folytatása
            </> : <>
              Megnyitás <HiOutlineArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </>}
          </span>
        </div>
      </Link>
      {slug !== undefined && <TripCompanionBadge count={companionCount} name={name} slug={slug} userId={userId} />}
    </div>
    {footer}
  </article>;
}

