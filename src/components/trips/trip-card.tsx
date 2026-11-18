import Link from "next/link";
import type { ReactNode } from "react";
import { HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlineCheck, HiOutlineMapPin, HiOutlinePencil, HiOutlineUsers } from "react-icons/hi2";
import type { TripSummary } from "@/lib/api";
import { calendarDay } from "./trip-calendar";
import { TripCardCover } from "./trip-card-cover";

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
} & ({ slug: string; sharedId?: never; owner?: never } | { slug?: never; sharedId: string; owner: string });

export function TripCard({ trip, slug, sharedId, owner, status, inProgress, footer }: Props) {
  const { name, destination, start, end, stopCount, companionCount } = trip;
  const Heading = owner ? "h3" : "h2";
  const { label, Icon, color } = statuses[status];
  const duration = calendarDay(end) - calendarDay(start) + 1;
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));
  return <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-colors hover:border-brand/70 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
    <TripCardCover slug={slug} sharedId={sharedId}>
      <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${color}`}>
        <Icon aria-hidden="true" className="size-4" />
        {inProgress ? "Folyamatban" : label}
      </span>
      {slug && <Link href={`/utazasok/${encodeURIComponent(slug)}/szerkesztes`} prefetch={false}
        aria-label={`Utazás szerkesztése: ${name}`} title="Utazás szerkesztése"
        className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <HiOutlinePencil aria-hidden="true" className="size-4" />
      </Link>}
    </TripCardCover>
    <Link
      href={slug !== undefined ? `/utazasok/${encodeURIComponent(slug)}` : `/utazasok/megosztott/${sharedId}`}
      prefetch={false}
      className="flex flex-1 flex-col p-4 before:absolute before:inset-0 before:content-[''] focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <Heading className="min-w-0 flex-1 wrap-break-word text-lg font-bold tracking-tight">{name}</Heading>
        <span title={`${companionCount} útitárs`} className="grid size-10 shrink-0 place-content-center justify-items-center gap-0.5 rounded-full bg-brand/10 text-xs leading-none font-semibold text-foreground tabular-nums">
          <HiOutlineUsers aria-hidden="true" className="size-3.5" />
          <span>{companionCount}<span className="sr-only"> útitárs</span></span>
        </span>
      </div>
      {destination !== name && <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{destination}</p>}
      {owner && <p className="mt-1 wrap-break-word text-xs text-muted-foreground">Megosztotta {owner}</p>}
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
          {status === "planning" && !sharedId ? <>
            <HiOutlinePencil aria-hidden="true" className="size-4 shrink-0" /> Tervezés folytatása
          </> : <>
            Megnyitás <HiOutlineArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </>}
        </span>
      </div>
    </Link>
    {footer}
  </article>;
}

